// 键完整性校验：检查目标页面/TS 文件引用的所有 data-i18n* 键
// 在 en 和 zh 语言包中都存在。缺失数必须为 0。
// 用法：node scripts/i18n-check-keys.mjs <文件1> [文件2 ...]
//   node scripts/i18n-check-keys.mjs src/pages/merge-pdf.html src/js/logic/merge-pdf-page.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('用法: node scripts/i18n-check-keys.mjs <文件1> [文件2 ...]');
  process.exit(1);
}

const bundles = {};
const resolve = (lang, ns, key) => {
  const bundle =
    bundles[`${lang}/${ns}`] ??
    (bundles[`${lang}/${ns}`] = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, `public/locales/${lang}/${ns}.json`),
        'utf8'
      )
    ));
  return key.split('.').reduce((acc, part) => acc?.[part], bundle);
};

const keys = new Set();
for (const file of targets) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // HTML: data-i18n="..." / data-i18n-placeholder / data-i18n-title
  for (const m of content.matchAll(
    /data-i18n(?:-placeholder|-title)?="([^"]+)"/g
  )) {
    keys.add(m[1]);
  }
  // TS: translate('...', ...) 或 t('...')
  for (const m of content.matchAll(
    /(?<![A-Za-z])(?:translate|t)\(\s*'([^']+)'/g
  )) {
    keys.add(m[1]);
  }
}

let missing = 0;
for (const key of keys) {
  let ns = 'common';
  let bareKey = key;
  if (key.startsWith('tools:')) {
    ns = 'tools';
    bareKey = key.slice(6);
  }
  for (const lang of ['en', 'zh']) {
    if (resolve(lang, ns, bareKey) === undefined) {
      console.log(`缺失: ${lang}/${ns}.json -> ${bareKey}`);
      missing++;
    }
  }
}
console.log(`共检查 ${keys.size} 个键，缺失 ${missing} 个`);
process.exit(missing === 0 ? 0 : 1);
