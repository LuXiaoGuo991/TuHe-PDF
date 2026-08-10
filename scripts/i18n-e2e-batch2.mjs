// 批 2 E2E 验证：中文用户在 split/jpg-to/edit/sign/compress 页实际操作，
// 断言动态渲染文案与结果弹窗为中文。
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TMP = path.join(ROOT, 'output', 'e2e-fixtures');
fs.mkdirSync(TMP, { recursive: true });

// fixture：3 页 PDF（split/compress 用）
const pdfPath = path.join(TMP, 'three-pages.pdf');
{
  const doc = await PDFDocument.create();
  for (const label of ['P1', 'P2', 'P3']) {
    const p = doc.addPage([300, 300]);
    p.drawText(label, { x: 50, y: 250, size: 24 });
  }
  fs.writeFileSync(pdfPath, await doc.save());
}
// fixture：JPG（jpg-to-pdf 用，稍后由浏览器 canvas 生成）
const jpgPath = path.join(TMP, 'photo.jpg');

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
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: exe });

// 用浏览器 canvas 生成 JPG fixture
if (!fs.existsSync(jpgPath)) {
  const genPage = await browser.newPage();
  const dataUrl = await genPage.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '40px sans-serif';
    ctx.fillText('JPG', 70, 110);
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  fs.writeFileSync(jpgPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await genPage.close();
}

const results = [];
const check = (name, actual, pattern = /[一-龥]/) => {
  const text = (actual || '').trim();
  const ok = pattern.test(text);
  results.push({ name, text: text.slice(0, 60), ok });
};

const newZhPage = async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'zh'));
  return page;
};

const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const shouldRun = (name) => !ONLY || ONLY.includes(name);
const log = (...args) =>
  console.log(new Date().toISOString().slice(11, 19), ...args);

/* ---- split-pdf：上传 3 页 PDF，按范围分割，断言成功弹窗 ---- */
if (shouldRun('split'))
  try {
    log('split 开始');
    const page = await newZhPage();
    await page.goto(`http://127.0.0.1:${port}/split-pdf.html`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.setInputFiles('#file-input', pdfPath);
    await page.waitForSelector('#file-display-area .truncate', {
      timeout: 30000,
    });
    await page.waitForTimeout(2500);
    check(
      'split 文件页数元信息',
      await page.textContent('#file-display-area .text-xs'),
      /共 3 页/
    );
    await page.fill('#page-range', '1');
    await page.click('#process-btn');
    await page.waitForSelector('#alert-modal:not(.hidden)', {
      timeout: 120000,
    });
    check('split 成功弹窗标题', await page.textContent('#alert-title'));
    check(
      'split 成功弹窗内容',
      await page.textContent('#alert-message'),
      /分割成功/
    );
    await page.close();
  } catch (e) {
    results.push({ name: 'split 流程', text: '异常: ' + e.message, ok: false });
  }

if (shouldRun('jpg'))
  try {
    log('jpg 开始');
    /* ---- jpg：上传 JPG 并转换，断言成功弹窗 ---- */
    const page = await newZhPage();
    page.on('console', (m) => log('[console]', m.text().slice(0, 120)));
    page.on('pageerror', (e) => log('[pageerror]', e.message.slice(0, 200)));
    await page.goto(`http://127.0.0.1:${port}/jpg-to-pdf.html`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.setInputFiles('#file-input', jpgPath);
    await page.waitForSelector('#jpg-to-pdf-options:not(.hidden)', {
      timeout: 30000,
    });
    log('jpg 已上传，点击转换');
    await page.click('#process-btn');
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(15000);
      const loaderVisible = await page.isVisible('#loader-modal');
      const loaderText = loaderVisible
        ? await page.textContent('#loader-text')
        : '';
      const alertVisible = await page.isVisible('#alert-modal');
      log(
        `jpg t+${(i + 1) * 15}s loader=${loaderVisible ? loaderText.trim() : '隐藏'} alert=${alertVisible}`
      );
      if (alertVisible) break;
    }
    check('jpg 成功弹窗标题', await page.textContent('#alert-title'));
    check(
      'jpg 成功弹窗内容',
      await page.textContent('#alert-message'),
      /创建成功/
    );
    await page.close();
  } catch (e) {
    results.push({ name: 'jpg 流程', text: '异常: ' + e.message, ok: false });
  }

if (shouldRun('edit'))
  try {
    log('edit 开始');
    /* ---- edit：上传 PDF，断言动态下载按钮文案 ---- */
    const page = await newZhPage();
    await page.goto(`http://127.0.0.1:${port}/edit-pdf.html`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.setInputFiles('#file-input', pdfPath);
    await page.waitForSelector('#download-edited-pdf', { timeout: 120000 });
    check(
      'edit 下载按钮文案',
      await page.textContent('#download-edited-pdf'),
      /下载编辑后的 PDF/
    );
    await page.close();
  } catch (e) {
    results.push({ name: 'edit 流程', text: '异常: ' + e.message, ok: false });
  }

if (shouldRun('sign'))
  try {
    log('sign 开始');
    /* ---- sign：上传 PDF，等待查看器就绪后保存，断言成功弹窗 ---- */
    const page = await newZhPage();
    await page.goto(`http://127.0.0.1:${port}/sign-pdf.html`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.setInputFiles('#file-input', pdfPath);
    await page.waitForSelector('#file-display-area .truncate', {
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    check(
      'sign 文件页数元信息',
      await page.textContent('#file-display-area .text-xs'),
      /共 3 页/
    );
    await page.waitForSelector('#process-btn', {
      state: 'visible',
      timeout: 120000,
    });
    await page
      .click('#flatten-signature-toggle', { force: true })
      .catch(() => {});
    await page.click('#process-btn', { force: true });
    await page.waitForSelector('#alert-modal:not(.hidden)', {
      timeout: 120000,
    });
    check('sign 成功弹窗标题', await page.textContent('#alert-title'));
    check(
      'sign 成功弹窗内容',
      await page.textContent('#alert-message'),
      /保存成功|下载成功/
    );
    await page.close();
  } catch (e) {
    results.push({ name: 'sign 流程', text: '异常: ' + e.message, ok: false });
  }

if (shouldRun('compress'))
  try {
    log('compress 开始');
    /* ---- compress：上传 PDF 点击压缩，断言 loader 与结果弹窗 ---- */
    const page = await newZhPage();
    await page.goto(`http://127.0.0.1:${port}/compress-pdf.html`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.setInputFiles('#file-input', pdfPath);
    await page.waitForSelector('#compress-options:not(.hidden)', {
      timeout: 30000,
    });
    await page.click('#process-btn');
    await page.waitForSelector('#alert-modal:not(.hidden)', {
      timeout: 180000,
    });
    check('compress 结果弹窗标题', await page.textContent('#alert-title'));
    check(
      'compress 结果弹窗内容',
      await page.textContent('#alert-message'),
      /方式：/
    );
    await page.close();
  } catch (e) {
    results.push({
      name: 'compress 流程',
      text: '异常: ' + e.message,
      ok: false,
    });
  }

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
