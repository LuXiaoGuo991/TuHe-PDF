// 运行时冒烟测试：静态服务器 + 真实 Chromium，验证中文语言下
// 新接线的 data-i18n 元素会被 applyTranslations() 替换为中文。
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

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
  if (!fs.existsSync(filePath) && !urlPath.endsWith('.html')) {
    // vite 习惯：无扩展路径回退到 .html
    filePath += '.html';
  }
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
console.log('测试服务器端口:', port);

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();

const results = [];
const check = async (name, actual, expectChinese) => {
  const ok = expectChinese ? /[一-龥]/.test(actual || '') : true;
  results.push({ name, actual, ok });
};

// 模拟已选择中文的用户（localStorage 是 getLanguageFromUrl 的第二优先级）
await page.addInitScript(() => {
  localStorage.setItem('i18nextLng', 'zh');
});

await page.goto(`http://127.0.0.1:${port}/merge-pdf.html`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1500);

await check('merge h1', await page.textContent('h1[data-i18n]'), true);
await check(
  'merge fileMode 按钮',
  await page.textContent('#file-mode-btn'),
  true
);
await check('merge process-btn', await page.textContent('#process-btn'), true);
await check(
  'merge How-it-works 提示',
  await page.textContent('#file-mode-panel strong'),
  true
);
await check('merge alert OK', await page.textContent('#alert-ok'), true);
await check(
  'merge FAQ 问题',
  await page.textContent('details summary span'),
  true
);
await check('merge 相关工具卡片', await page.textContent('.grid h3'), true);
await check('merge loader', await page.textContent('#loader-text'), true);

await page.goto(`http://127.0.0.1:${port}/split-pdf.html`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1500);
await check(
  'split 拆分方式 label',
  await page.textContent('label[for=split-mode]'),
  true
);
await check(
  'split 第一个 option',
  await page.textContent('#split-mode option'),
  true
);
await check(
  'split 偶数页 label',
  await page.textContent('label[for=split-even]'),
  true
);
await check('split process-btn', await page.textContent('#process-btn'), true);

await page.goto(`http://127.0.0.1:${port}/compress-pdf.html`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1500);
await check(
  'compress 算法 label',
  await page.textContent('label[for=compression-algorithm]'),
  true
);
await check(
  'compress condense 说明',
  await page.textContent('#condense-info'),
  true
);
await check(
  'compress 灰度 label',
  await page.textContent('label[for=convert-to-grayscale]'),
  true
);
await check(
  'compress process-btn',
  await page.textContent('#process-btn'),
  true
);

await page.goto(`http://127.0.0.1:${port}/jpg-to-pdf.html`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1500);
await check(
  'jpg 质量 label',
  await page.textContent('label[for=jpg-pdf-quality]'),
  true
);
await check('jpg process-btn', await page.textContent('#process-btn'), true);
await check('jpg HIW 步骤标题', await page.textContent('section h3'), true);

await browser.close();
server.close();

let failed = 0;
for (const r of results) {
  console.log(
    `${r.ok ? '✔' : '✘'} ${r.name}: ${JSON.stringify((r.actual || '').trim().slice(0, 40))}`
  );
  if (!r.ok) failed++;
}
console.log(
  failed === 0 ? `\n全部 ${results.length} 项通过` : `\n${failed} 项失败`
);
process.exit(failed === 0 ? 0 : 1);
