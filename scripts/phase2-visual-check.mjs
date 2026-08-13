import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUTPUT = path.join(ROOT, 'output', 'playwright');
const FIXTURES = path.join(os.tmpdir(), 'tuhe-phase2-visual-fixtures');

fs.mkdirSync(OUTPUT, { recursive: true });
fs.mkdirSync(FIXTURES, { recursive: true });

async function createPdf(name, title, pages = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${title} - Page ${index + 1}`, {
      x: 64,
      y: 760,
      size: 24,
      font,
      color: rgb(0.15, 0.24, 0.2),
    });
    page.drawRectangle({
      x: 64,
      y: 680,
      width: 300,
      height: 24,
      color: rgb(0.31, 0.61, 0.47),
    });
  }
  const target = path.join(FIXTURES, name);
  fs.writeFileSync(target, await doc.save());
  return target;
}

const pdfA = await createPdf('phase2-a.pdf', 'TuHe Phase 2 A');
const pdfB = await createPdf('phase2-b.pdf', 'TuHe Phase 2 B');
const jpg = path.join(FIXTURES, 'phase2-image.jpg');
fs.writeFileSync(
  jpg,
  Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
    'base64'
  )
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let filePath = path.resolve(DIST, `.${urlPath}`);
  if (!filePath.startsWith(`${DIST}${path.sep}`) && filePath !== DIST) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(filePath) && !path.extname(filePath)) filePath += '.html';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type':
      MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
});

function findChromium() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(root))
    throw new Error(`Playwright cache not found: ${root}`);
  const candidates = fs
    .readdirSync(root)
    .flatMap((dir) => [
      path.join(
        root,
        dir,
        'chrome-headless-shell-win64',
        'chrome-headless-shell.exe'
      ),
      path.join(root, dir, 'chrome-win64', 'chrome.exe'),
    ]);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable)
    throw new Error(`Playwright Chromium not found under ${root}`);
  return executable;
}

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: findChromium() });

const results = [];
const pageErrors = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, error) =>
  results.push({ name, ok: false, detail: String(error) });
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function createPage(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({
    viewport,
    locale: 'zh-CN',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'zh');
    localStorage.setItem('tuhe.rail.expanded', 'false');
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { context, page };
}

async function goto(page, pathname) {
  await page.goto(`${baseUrl}/${pathname}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { state: 'visible' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(350);
}

async function screenshot(page, name, fullPage = true) {
  const target = path.join(OUTPUT, `${name}.png`);
  await page.screenshot({ path: target, fullPage, animations: 'disabled' });
  return target;
}

async function assertVisibleBox(page, selector, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 60_000 });
  const box = await locator.boundingBox();
  check(
    box && box.width > 0 && box.height > 0,
    `${label} has no visible bounding box`
  );
  return box;
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} horizontal overflow: ${dimensions.scrollWidth} > ${dimensions.clientWidth}`
  );
}

async function validateWorkbench() {
  const { context, page } = await createPage();
  try {
    await goto(page, 'index.html');
    await assertVisibleBox(page, '.wb-topbar', 'workbench topbar');
    await assertVisibleBox(page, '#tool-rail', 'workbench rail');
    await assertVisibleBox(page, '.tuhe-quick-card', 'workbench tool card');
    const quickToolIds = await page
      .locator('.tuhe-quick-card')
      .evaluateAll((cards) => cards.map((card) => card.dataset.openTool));
    check(
      quickToolIds.length === 8,
      `expected 8 quick tools, found ${quickToolIds.length}`
    );
    check(
      quickToolIds[0] === 'image-to-pdf' && quickToolIds[1] === 'pdf-to-png',
      `unexpected leading quick tools: ${quickToolIds.slice(0, 2).join(', ')}`
    );
    check(
      (await page.locator('.tuhe-category-stack').count()) === 0,
      'removed home category browser is still present'
    );
    await screenshot(page, 'workbench-topbar');
    await screenshot(page, 'workbench-rail-collapsed');

    const railBefore = await page.locator('#tool-rail').boundingBox();
    await page.click('#rail-toggle');
    await page.waitForFunction(() =>
      document.querySelector('#tool-rail')?.classList.contains('rail-expanded')
    );
    await page.waitForTimeout(400);
    const railAfter = await page.locator('#tool-rail').boundingBox();
    const railWidth = await page
      .locator('#tool-rail')
      .evaluate((element) => parseFloat(getComputedStyle(element).width));
    check(
      railBefore &&
        railAfter &&
        railAfter.width > railBefore.width &&
        railWidth > 200,
      'rail did not expand'
    );
    await screenshot(page, 'workbench-rail-expanded');

    const card = page.locator('.tuhe-quick-card').first();
    const before = await card.boundingBox();
    await card.hover();
    await page.waitForTimeout(200);
    const after = await card.boundingBox();
    check(
      before && after && before.x === after.x && before.y === after.y,
      'card hover shifted position'
    );
    await screenshot(page, 'workbench-card-hover');

    await page.focus('#home-tool-search');
    const focusStyle = await page
      .locator('#home-tool-search')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          borderColor: style.borderColor,
        };
      });
    check(
      focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px',
      'focus-visible ring missing'
    );
    await screenshot(page, 'workbench-search-focus');

    await page.fill('#home-tool-search', 'PNG');
    const visibleQuickToolIds = await page
      .locator('.tuhe-quick-card:visible')
      .evaluateAll((cards) => cards.map((card) => card.dataset.openTool));
    check(
      visibleQuickToolIds.length === 1 &&
        visibleQuickToolIds[0] === 'pdf-to-png',
      `PNG search returned: ${visibleQuickToolIds.join(', ')}`
    );
    await page.press('#home-tool-search', 'Enter');
    await page.waitForSelector(
      '.wb-panel-active iframe[src$="pdf-to-png.html"]'
    );
    pass(
      'workbench desktop states',
      '8 quick tools, order, search navigation, and responsive states'
    );
  } finally {
    await context.close();
  }

  const mobile = await createPage({ width: 375, height: 812 });
  try {
    await goto(mobile.page, 'index.html');
    await assertNoHorizontalOverflow(mobile.page, 'workbench 375px');
    const mobileTopbar = await assertVisibleBox(
      mobile.page,
      '.wb-topbar',
      'mobile workbench topbar'
    );
    check(
      mobileTopbar.height <= 60,
      `mobile topbar wrapped unexpectedly: ${mobileTopbar.height}px`
    );
    const visibleTopbarLinks = await mobile.page
      .locator('.wb-topbar-nav > a:visible')
      .count();
    check(visibleTopbarLinks === 0, 'mobile topbar text links should collapse');
    const mobileLanguageButton = await assertVisibleBox(
      mobile.page,
      '#topbar-lang-switcher .language-switcher-button',
      'mobile language switcher'
    );
    check(
      mobileLanguageButton.width >= 44 && mobileLanguageButton.height >= 44,
      'mobile language switcher target is smaller than 44px'
    );
    await assertVisibleBox(
      mobile.page,
      '.tuhe-quick-card',
      'mobile workbench tool card'
    );
    await screenshot(mobile.page, 'workbench-mobile-375');
    pass('workbench mobile 375px');
  } finally {
    await mobile.context.close();
  }
}

async function validateMerge() {
  const { context, page } = await createPage();
  try {
    await goto(page, 'merge-pdf.html');
    await assertVisibleBox(page, '#drop-zone', 'merge drop zone');
    await screenshot(page, 'merge-upload');

    await page.setInputFiles('#file-input', [pdfA, pdfB]);
    await page.waitForSelector('#file-list li', { timeout: 60_000 });
    await assertVisibleBox(page, '#process-btn', 'merge primary action');
    await screenshot(page, 'merge-file-list');

    await page.click('#clear-files-btn');
    await assertVisibleBox(
      page,
      '#clear-confirm-modal:not(.hidden)',
      'merge danger confirmation'
    );
    await screenshot(page, 'merge-danger-confirmation');
    await page.click('#clear-cancel-btn');

    await page.evaluate(() => {
      const modal = document.querySelector('#loader-modal');
      modal?.classList.remove('hidden');
      const text = document.querySelector('#loader-text');
      if (text) text.textContent = '正在合并文档并整理页面…';
      const bar = document.querySelector('.loader-progress-bar');
      if (bar instanceof HTMLElement) bar.style.width = '58%';
      const percent = document.querySelector('.loader-progress-text');
      if (percent) percent.textContent = '58%';
    });
    await screenshot(page, 'merge-processing');
    await page.evaluate(() =>
      document.querySelector('#loader-modal')?.classList.add('hidden')
    );

    await page.click('#process-btn');
    await page.waitForSelector('#merge-result:not(.hidden)', {
      timeout: 120_000,
    });
    const alert = page.locator('#alert-modal:not(.hidden)');
    if (await alert.count()) await page.click('#alert-ok');
    await assertVisibleBox(
      page,
      '#download-result-btn',
      'merge result download action'
    );
    await screenshot(page, 'merge-success');
    pass(
      'merge desktop states',
      'upload, list, processing, success and danger confirmation screenshots'
    );
  } finally {
    await context.close();
  }

  const mobile = await createPage({ width: 375, height: 812 });
  try {
    await goto(mobile.page, 'merge-pdf.html');
    await assertNoHorizontalOverflow(mobile.page, 'merge 375px');
    await assertVisibleBox(mobile.page, '#drop-zone', 'mobile merge drop zone');
    await screenshot(mobile.page, 'merge-mobile-375');
    pass('merge mobile 375px');
  } finally {
    await mobile.context.close();
  }
}

const tools = [
  {
    slug: 'split-pdf',
    fixture: pdfA,
    state: '#split-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'compress-pdf',
    fixture: pdfA,
    state: '#compress-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'jpg-to-pdf',
    fixture: jpg,
    state: '#jpg-to-pdf-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'edit-pdf',
    fixture: pdfA,
    state: '#embed-pdf-wrapper:not(.hidden)',
    action: '#embed-pdf-wrapper',
  },
  {
    slug: 'sign-pdf',
    fixture: pdfA,
    state: '#signature-editor:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'ocr-pdf',
    fixture: pdfA,
    state: '#tool-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'pdf-to-docx',
    fixture: pdfA,
    state: '#convert-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'rotate-pdf',
    fixture: pdfA,
    state: '#tool-options:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'page-numbers',
    fixture: pdfA,
    state: '#options-panel:not(.hidden)',
    action: '#process-btn',
  },
  {
    slug: 'add-watermark',
    fixture: pdfA,
    state: '#editor-panel:not(.hidden)',
    action: '#process-btn',
  },
];

async function validateTool(tool) {
  const { context, page } = await createPage();
  try {
    await goto(page, `${tool.slug}.html`);
    await assertVisibleBox(page, '#drop-zone', `${tool.slug} upload drop zone`);
    await screenshot(page, `${tool.slug}-upload`);
    await page.setInputFiles('#file-input', tool.fixture);
    await page.waitForSelector(tool.state, {
      state: 'visible',
      timeout: 90_000,
    });
    await assertVisibleBox(page, tool.action, `${tool.slug} action state`);
    await screenshot(page, `${tool.slug}-action`);
    pass(`${tool.slug} upload/action states`);
  } catch (error) {
    fail(`${tool.slug} upload/action states`, error);
  } finally {
    await context.close();
  }
}

async function validateThemeSync() {
  const { context, page } = await createPage();
  try {
    await goto(page, 'index.html');
    await page.fill('#home-tool-search', 'PNG');
    await page.press('#home-tool-search', 'Enter');
    await page.waitForSelector(
      '.wb-panel-active iframe[src$="pdf-to-png.html"]'
    );

    const frame = page
      .frames()
      .find(
        (f) => f !== page.mainFrame() && f.url().includes('pdf-to-png.html')
      );
    check(frame, 'tool iframe did not become a frame');

    // Wait until the iframe has run initTheme (data-theme attribute set).
    await frame.waitForFunction(
      () => document.documentElement.hasAttribute('data-theme'),
      { timeout: 10_000 }
    );

    const parentBefore = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    const frameBefore = await frame.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    check(
      parentBefore === 'dark' && frameBefore === 'dark',
      `expected dark before toggle, got parent=${parentBefore} iframe=${frameBefore}`
    );

    await page.click('#topbar-theme-toggle');
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'light'
    );
    await frame.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'light',
      { timeout: 5_000 }
    );

    // A freshly opened standalone tool page must inherit the persisted theme.
    const fresh = await context.newPage();
    await goto(fresh, 'pdf-to-png.html');
    const freshTheme = await fresh.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    check(
      freshTheme === 'light',
      `standalone tool page did not inherit light theme (got ${freshTheme})`
    );
    await fresh.close();

    await screenshot(page, 'theme-sync-light');
    pass(
      'theme iframe sync',
      'toggle syncs open iframe and standalone page inherits persisted theme'
    );
  } finally {
    await context.close();
  }
}

try {
  await validateWorkbench();
  await validateMerge();
  await validateThemeSync();
  for (const tool of tools) await validateTool(tool);
} catch (error) {
  fail('phase2 visual suite', error);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

for (const result of results) {
  console.log(
    `${result.ok ? '✔' : '✘'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`
  );
}
if (pageErrors.length) {
  console.log(`\nBrowser page errors observed (${pageErrors.length}):`);
  for (const error of [...new Set(pageErrors)].slice(0, 20))
    console.log(`- ${error}`);
}
const screenshots = fs
  .readdirSync(OUTPUT)
  .filter((name) => name.endsWith('.png'));
console.log(`\nScreenshots: ${screenshots.length} files in ${OUTPUT}`);
const failed = results.filter((result) => !result.ok);
console.log(
  failed.length
    ? `${failed.length} visual checks failed`
    : 'Phase 2 visual checks passed'
);
process.exit(failed.length ? 1 : 0);
