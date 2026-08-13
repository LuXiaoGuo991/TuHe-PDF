import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'public', 'fonts');
const cacheDir = path.join(root, '.cache', 'fonts');
const regularSource = path.join(
  root,
  'public',
  'wasm',
  'ocr',
  'fonts',
  'NotoSansCJKsc-Regular.otf'
);
const mediumSource = path.join(cacheDir, 'SourceHanSansSC-Medium.otf');
const pyftsubset =
  process.env.PYFTSUBSET ||
  (process.platform === 'win32'
    ? 'D:\\Anaconda\\Scripts\\pyftsubset.exe'
    : 'pyftsubset');

const mediumUrls = [
  'https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/OTF/SimplifiedChinese/SourceHanSansSC-Medium.otf',
  'https://v4.gh-proxy.org/https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/OTF/SimplifiedChinese/SourceHanSansSC-Medium.otf',
];

const exists = async (file) => {
  try {
    await access(file, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const download = async (url, target) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 10_000_000) {
      throw new Error(`unexpected font size: ${bytes.length}`);
    }
    await writeFile(target, bytes);
  } finally {
    clearTimeout(timeout);
  }
};

const ensureMediumSource = async () => {
  if (process.env.SOURCE_HAN_MEDIUM) {
    const override = path.resolve(process.env.SOURCE_HAN_MEDIUM);
    if (!(await exists(override)))
      throw new Error(`Missing SOURCE_HAN_MEDIUM: ${override}`);
    return override;
  }
  if (await exists(mediumSource)) return mediumSource;
  await mkdir(cacheDir, { recursive: true });
  let lastError;
  for (const [index, url] of mediumUrls.entries()) {
    try {
      console.log(
        `Downloading Source Han Sans SC Medium${index ? ' via GitHub proxy fallback' : ''}...`
      );
      await download(url, mediumSource);
      return mediumSource;
    } catch (error) {
      lastError = error;
      await rm(mediumSource, { force: true });
    }
  }
  throw lastError;
};

const buildCharacterSet = () => {
  const decoder = new TextDecoder('gb18030', { fatal: false });
  const chars = new Set();
  for (let lead = 0xb0; lead <= 0xd7; lead += 1) {
    const finalTrail = lead === 0xd7 ? 0xf9 : 0xfe;
    for (let trail = 0xa1; trail <= finalTrail; trail += 1) {
      const char = decoder.decode(Uint8Array.of(lead, trail));
      if (char !== '\uFFFD') chars.add(char);
    }
  }
  const ascii = Array.from({ length: 95 }, (_, index) =>
    String.fromCharCode(0x20 + index)
  ).join('');
  const punctuation =
    '，。！？；：、“”‘’（）【】《》〈〉—…·￥％＋－×÷＝＠＃＆＊／\\｜～　';
  for (const char of `${ascii}${punctuation}`) chars.add(char);
  if (chars.size < 3800)
    throw new Error(`Unexpected character set size: ${chars.size}`);
  return [...chars].join('');
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', cwd: root });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with ${code}`))
    );
  });

const subset = async (source, output) => {
  const textFile = path.join(cacheDir, 'source-han-gb18030-level1.txt');
  await writeFile(textFile, buildCharacterSet(), 'utf8');
  await run(pyftsubset, [
    source,
    `--text-file=${textFile}`,
    `--output-file=${output}`,
    '--flavor=woff2',
    '--layout-features=*',
    '--name-IDs=*',
    '--name-legacy',
    '--name-languages=*',
    '--glyph-names',
    '--symbol-cmap',
    '--legacy-cmap',
    '--notdef-glyph',
    '--notdef-outline',
    '--recommended-glyphs',
  ]);
  const bytes = (await readFile(output)).byteLength;
  if (bytes >= 4 * 1024 * 1024)
    throw new Error(
      `${path.basename(output)} is ${bytes} bytes (must be < 4 MB)`
    );
  console.log(
    `✓ ${path.relative(root, output)} ${(bytes / 1024 / 1024).toFixed(2)} MB`
  );
};

await mkdir(outputDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });
if (!(await exists(regularSource)))
  throw new Error(`Missing regular source font: ${regularSource}`);
const resolvedMediumSource = await ensureMediumSource();
await subset(
  regularSource,
  path.join(outputDir, 'SourceHanSansSC-Regular.woff2')
);
await subset(
  resolvedMediumSource,
  path.join(outputDir, 'SourceHanSansSC-Medium.woff2')
);
