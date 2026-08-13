import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const tools = [
  ['split-pdf', 'splitPdf'],
  ['compress-pdf', 'compressPdf'],
  ['jpg-to-pdf', 'jpgToPdf'],
  ['edit-pdf', 'pdfEditor'],
  ['sign-pdf', 'signPdf'],
  ['ocr-pdf', 'ocrPdf'],
  ['pdf-to-docx', 'pdfToWord'],
  ['rotate-pdf', 'rotatePdf'],
  ['page-numbers', 'pageNumbers'],
  ['add-watermark', 'addWatermark'],
];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let filePath = path.join(DIST, urlPath);
  if (!filePath.startsWith(DIST)) return res.writeHead(403).end();
  if (!fs.existsSync(filePath) && !urlPath.endsWith('.html'))
    filePath += '.html';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
    return res.writeHead(404).end('not found');
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(res);
});
function findChromium() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const candidates = fs.existsSync(root)
    ? fs
        .readdirSync(root)
        .flatMap((dir) => [
          path.join(
            root,
            dir,
            'chrome-headless-shell-win64',
            'chrome-headless-shell.exe'
          ),
          path.join(root, dir, 'chrome-win64', 'chrome.exe'),
        ])
    : [];
  const executable = candidates.find(fs.existsSync);
  if (!executable)
    throw new Error(`Playwright Chromium not found under ${root}`);
  return executable;
}
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('i18nextLng', 'zh'));
const results = [];
for (const [slug, key] of tools) {
  await page.goto(`http://127.0.0.1:${port}/${slug}.html`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(500);
  const heading = (await page.textContent('h1[data-i18n]'))?.trim() || '';
  const rootClass = await page.getAttribute('body', 'class');
  const hasChinese = /[一-龥]/.test(heading);
  const semanticRoot = rootClass?.includes('phase2-tool-page') ?? false;
  const translation = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/locales/zh/tools.json'), 'utf8')
  )[key];
  const translationPresent = Boolean(translation?.name);
  const ok = hasChinese && semanticRoot && translationPresent;
  results.push({ slug, heading, ok });
}
await browser.close();
server.close();
for (const result of results)
  console.log(
    `${result.ok ? '✔' : '✘'} ${result.slug}: ${JSON.stringify(result.heading)}`
  );
const failed = results.filter((result) => !result.ok);
console.log(
  failed.length
    ? `\n${failed.length} 个工具页失败`
    : `\n10 个工具页中文首屏断言全部通过`
);
process.exit(failed.length ? 1 : 0);
