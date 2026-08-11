import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';
import { fallbackLanguages } from '../src/js/i18n/fallback-languages.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const LOCALES_DIR = path.join(ROOT, 'public/locales');
const ZH_DIR = path.join(DIST_DIR, 'zh');

function flatten(obj, prefix = '') {
  return Object.entries(obj || {}).reduce((result, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, nextKey));
    } else {
      result[nextKey] = value;
    }
    return result;
  }, {});
}

const resources = {};
for (const lang of ['zh', 'en']) {
  resources[lang] = {
    common: flatten(
      JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, lang, 'common.json'), 'utf8')
      )
    ),
    tools: flatten(
      JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, lang, 'tools.json'), 'utf8')
      )
    ),
  };
}

function resolve(key) {
  const toolsKey = key.startsWith('tools:');
  const resource = toolsKey ? 'tools' : 'common';
  const resourceKey = toolsKey ? key.slice('tools:'.length) : key;
  const candidates = ['zh', ...(fallbackLanguages.zh || ['en']), 'en'];
  for (const lang of [...new Set(candidates)]) {
    const value = resources[lang][resource][resourceKey];
    if (typeof value === 'string') return value;
  }
  return null;
}

if (!fs.existsSync(ZH_DIR)) {
  console.error('Static i18n check failed: dist/zh does not exist.');
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.name.endsWith('.html')) files.push(entryPath);
  }
}
walk(ZH_DIR);

const failures = [];
for (const file of files) {
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  const document = dom.window.document;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    const expected = key ? resolve(key) : null;
    if (expected === null || element.textContent !== expected) {
      failures.push(`${path.relative(ROOT, file)}: ${key || '(missing key)'}`);
    }
  });
  document
    .querySelectorAll('[data-i18n-placeholder], [data-i18n-title]')
    .forEach((element) => {
      const attribute = element.hasAttribute('data-i18n-placeholder')
        ? 'placeholder'
        : 'title';
      const key = element.getAttribute(`data-i18n-${attribute}`);
      const expected = key ? resolve(key) : null;
      if (expected === null || element.getAttribute(attribute) !== expected) {
        failures.push(
          `${path.relative(ROOT, file)}: ${key || `(missing ${attribute} key)`}`
        );
      }
    });
  if (file.endsWith(`${path.sep}index.html`)) {
    const docs = document.querySelector('[data-i18n="nav.docs"]');
    if (!docs || docs.textContent !== '文档')
      failures.push(`${path.relative(ROOT, file)}: nav.docs`);
  }
  const advanced = document.querySelector(
    '[data-i18n="footer.advancedSettings"]'
  );
  if (advanced && advanced.textContent !== '高级设置') {
    failures.push(`${path.relative(ROOT, file)}: footer.advancedSettings`);
  }
  dom.window.close();
}

if (failures.length) {
  console.error(
    `Static i18n check failed (${failures.length}):\n- ${failures.join('\n- ')}`
  );
  process.exit(1);
}

console.log(`Static zh i18n check passed (${files.length} HTML pages).`);
