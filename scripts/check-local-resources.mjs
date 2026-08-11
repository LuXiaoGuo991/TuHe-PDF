import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv.includes('--dist') ? 'dist' : 'public';
const baseDir = path.join(ROOT, target);

const REQUIRED_ASSETS = [
  'wasm/pymupdf/dist/index.js',
  'wasm/pymupdf/assets/pyodide.js',
  'wasm/ghostscript/gs.js',
  'wasm/ghostscript/gs.wasm',
  'wasm/cpdf/coherentpdf.browser.min.js',
  'wasm/tesseract/worker.min.js',
  'wasm/tesseract/core/tesseract-core.wasm',
  'wasm/tesseract/lang/chi_sim.traineddata.gz',
  'wasm/ocr/fonts/NotoSansCJKsc-Regular.otf',
  'wasm/ocr/fonts/NotoSans-Regular.ttf',
];

const missing = [];
const empty = [];
for (const relativePath of REQUIRED_ASSETS) {
  const filePath = path.join(baseDir, relativePath);
  if (!fs.existsSync(filePath)) {
    missing.push(relativePath);
    continue;
  }
  if (fs.statSync(filePath).size === 0) empty.push(relativePath);
}

if (target === 'public') {
  const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
  const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  const expectedFallbacks = [
    'pymupdf-wasm@',
    'gs-wasm@',
    'coherentpdf@',
    '/wasm/pymupdf/',
    '/wasm/ghostscript/',
    '/wasm/cpdf/',
  ];
  for (const marker of expectedFallbacks) {
    if (!sw.includes(marker)) missing.push(`public/sw.js fallback: ${marker}`);
  }
  for (const marker of [
    'VITE_WASM_PYMUPDF_URL=/wasm/pymupdf/',
    'VITE_WASM_GS_URL=/wasm/ghostscript/',
    'VITE_WASM_CPDF_URL=/wasm/cpdf/',
    'VITE_OCR_FONT_BASE_URL=/wasm/ocr/fonts/',
  ]) {
    if (!envExample.includes(marker)) missing.push(`.env.example: ${marker}`);
  }
}

if (missing.length || empty.length) {
  if (missing.length)
    console.error(
      `Missing resources in ${target}/:\n- ${missing.join('\n- ')}`
    );
  if (empty.length)
    console.error(`Empty resources in ${target}/:\n- ${empty.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Local resource health check passed (${target}/, ${REQUIRED_ASSETS.length} assets).`
);
