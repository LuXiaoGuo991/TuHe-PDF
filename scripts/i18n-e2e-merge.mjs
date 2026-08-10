// E2E 验证：中文用户在 merge-pdf 页实际上传两个 PDF 并合并，
// 检查上传后动态渲染的文案与成功弹窗均为中文。
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TMP = path.join(ROOT, 'output', 'e2e-fixtures');
fs.mkdirSync(TMP, { recursive: true });

// 生成两个最小 PDF 作为上传 fixture
for (const [name, text] of [
  ['test-a.pdf', 'Test A'],
  ['test-b.pdf', 'Test B'],
]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  page.drawText(text, { x: 50, y: 250, size: 24 });
  fs.writeFileSync(path.join(TMP, name), await doc.save());
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let filePath = path.join(DIST, urlPath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(filePath) && !urlPath.endsWith('.html'))
    filePath += '.html';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(res);
});

const exe = path.join(
  process.env.LOCALAPPDATA,
  'ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
);

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => localStorage.setItem('i18nextLng', 'zh'));

const results = [];
const check = (name, actual, mustHaveChinese = true) => {
  const text = (actual || '').trim();
  const ok = mustHaveChinese ? /[一-龥]/.test(text) : true;
  results.push({ name, text: text.slice(0, 50), ok });
};

await page.goto(`http://127.0.0.1:${port}/merge-pdf.html`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1000);

// 上传两个 PDF
await page.setInputFiles('#file-input', [
  path.join(TMP, 'test-a.pdf'),
  path.join(TMP, 'test-b.pdf'),
]);
await page.waitForSelector('#file-list li', { timeout: 30000 });
await page.waitForTimeout(2000);

check('文件列表页码 label', await page.textContent('#file-list li label'));
check(
  '范围输入框 placeholder',
  await page.getAttribute('#file-list li input', 'placeholder')
);
check(
  '删除按钮 title',
  await page.getAttribute('#file-list li button', 'title')
);

// 页面模式缩略图（触发渲染动态文案）
await page.click('#page-mode-btn');
await page.waitForSelector('#page-merge-preview .page-thumbnail', {
  timeout: 60000,
});
check(
  '页面模式缩略图标题',
  await page.getAttribute('#page-merge-preview .page-thumbnail p', 'title')
);

// 执行合并，等待成功弹窗
await page.click('#file-mode-btn');
await page.click('#process-btn');
await page.waitForSelector('#alert-modal:not(.hidden)', { timeout: 120000 });
check('成功弹窗标题', await page.textContent('#alert-title'));
check('成功弹窗内容', await page.textContent('#alert-message'));
check('弹窗按钮', await page.textContent('#alert-ok'));

await browser.close();
server.close();

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? '✔' : '✘'} ${r.name}: ${JSON.stringify(r.text)}`);
  if (!r.ok) failed++;
}
console.log(
  failed === 0 ? `\n全部 ${results.length} 项通过` : `\n${failed} 项失败`
);
process.exit(failed === 0 ? 0 : 1);
