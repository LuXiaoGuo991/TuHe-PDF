import { createHash } from 'node:crypto';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const packages = [
  {
    name: '@bentopdf/pymupdf-wasm@0.11.16',
    sourceRoot: 'node_modules/@bentopdf/pymupdf-wasm',
    targetRoot: 'public/wasm/pymupdf',
    copies: [
      ['assets', 'assets'],
      ['dist', 'dist'],
    ],
    files: {
      'assets/fonttools-4.56.0-py3-none-any.whl':
        'f0eb93d0f88a627151ac8bdabacce5941f616bf68119d06fd41a61c15541f852',
      'assets/lxml-5.4.0-cp313-cp313-pyodide_2025_0_wasm32.whl':
        'e5dead1eae2e4452bcddf6eaa73604fdd1ca0e35eb65e88fc4ec188e2219b8be',
      'assets/numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl':
        '125230b4c3ecd08803e5c43f1162e017c0718d9f253146225a705a952b9c16c2',
      'assets/opencv_python-4.11.0.86-cp313-cp313-pyodide_2025_0_wasm32.whl':
        '98d34430cef4a3171601811dd044d700c350373dde16f0a2dcd6d19cd4c859cf',
      'assets/pdf2docx-0.5.8-py3-none-any.whl':
        '8c5f439ba8147d59c20d33dadb275ff75a7f19b3b6179a9afda29ae2962514dc',
      'assets/pymupdf-1.26.3-cp313-none-pyodide_2025_0_wasm32.whl':
        'd1b117dff663c247f1fad2b51e5d4c8b4b5fa6fda5a105e8adcc0b43b5e86f40',
      'assets/pymupdf4llm-0.0.27-py3-none-any.whl':
        '2eaaf9419c35520efda38f3806a276f2ec6cd29564fbb60a5c9c53a49fedb13c',
      'assets/pyodide-lock.json':
        '0f0e5c5c691d6d4f6e0823335428393422320ae9b753fbddc6ba983ca9fc2ff4',
      'assets/pyodide.asm.js':
        'edf2e10c3ad0f2272e6f48456ed6a95c3a161b78cc0047d4d8520b17eda572f2',
      'assets/pyodide.asm.wasm':
        'a26051adcd0c5f3605cf7eefb285da10c0d7fd87bc2d26006e64f892015df657',
      'assets/pyodide.js':
        'f72278606dfe5864071877325bef8fa0fff30ccd1a130fdb0417a2d2ade65ce7',
      'assets/python_docx-1.2.0-py3-none-any.whl':
        '3fd478f3250fbbbfd3b94fe1e985955737c145627498896a8a6bf81f4baf66c7',
      'assets/python_stdlib.zip':
        'fc3e769b2be058249fddc8eb2a2ea2b54589852aa0f68eae2ff8247814d5276f',
      'assets/typing_extensions-4.12.2-py3-none-any.whl':
        '844a2928e7e7f0520597139c09c5b2f3c860792f51207feffde76da544b5cb2d',
      'dist/index.js':
        '8dccc58daed71e6898edf99200334e1db665a39265c93ff7cc1ca46101b4eab7',
    },
  },
  {
    name: '@bentopdf/gs-wasm@0.1.1',
    sourceRoot: 'node_modules/@bentopdf/gs-wasm',
    targetRoot: 'public/wasm/ghostscript',
    copies: [['assets', '.']],
    files: {
      'gs.js':
        '5e7e3b3dfc7afc5e60de8dd6dab66145c75afb74f7d671f711f390b3bb69c6d0',
      'gs.wasm':
        'c3373cd4a123f05b68513b57969db485d7f60f4b90145299de8c3182ea28f9b9',
    },
  },
  {
    name: 'coherentpdf@2.5.5',
    sourceRoot: 'node_modules/coherentpdf',
    targetRoot: 'public/wasm/cpdf',
    copies: [['dist/coherentpdf.browser.min.js', 'coherentpdf.browser.min.js']],
    files: {
      'coherentpdf.browser.min.js':
        '20c488fe4c58cf0c680434192fe8f6eda2f59ffc3ee4d6f2c5de961c066c54d1',
    },
  },
];

const absolute = (relativePath) => path.join(repoRoot, relativePath);

const assertExists = async (filePath, label) => {
  try {
    await stat(filePath);
  } catch {
    throw new Error(
      `${label} 不存在：${path.relative(repoRoot, filePath)}。请先运行 npm install。`
    );
  }
};

const sha256 = async (filePath) => {
  const { createReadStream } = await import('node:fs');
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', resolve)
      .on('error', reject);
  });
  return hash.digest('hex');
};

for (const pkg of packages) {
  const sourceRoot = absolute(pkg.sourceRoot);
  const targetRoot = absolute(pkg.targetRoot);
  await assertExists(sourceRoot, pkg.name);
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });

  for (const [source, target] of pkg.copies) {
    const sourcePath = path.join(sourceRoot, source);
    const targetPath = path.join(targetRoot, target);
    await assertExists(sourcePath, pkg.name);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { recursive: true });
  }

  for (const [relativePath, expectedHash] of Object.entries(pkg.files)) {
    const targetPath = path.join(targetRoot, relativePath);
    await assertExists(targetPath, pkg.name);
    const actualHash = await sha256(targetPath);
    if (actualHash !== expectedHash) {
      throw new Error(
        `${pkg.name} 校验失败：${path.relative(repoRoot, targetPath)}\n期望 ${expectedHash}\n实际 ${actualHash}`
      );
    }
  }

  console.log(
    `✓ ${pkg.name} → ${pkg.targetRoot}（${Object.keys(pkg.files).length} 个文件已校验）`
  );
}

console.log('WASM 本地资源准备完成。');
