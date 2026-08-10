import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set([
  'merge-pdf.html',
  'split-pdf.html',
  'compress-pdf.html',
  'jpg-to-pdf.html',
  'edit-pdf.html',
  'sign-pdf.html',
]);
const entries = [];

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const add = (file, kind, tag, text) => {
  const normalized = normalize(text);
  if (/[A-Za-z]{3,}/.test(normalized)) {
    entries.push({ file, kind, tag, text: normalized });
  }
};

for (const file of fs.readdirSync(path.join(ROOT, 'src/pages'))) {
  if (!file.endsWith('.html') || excluded.has(file)) continue;
  const source = fs.readFileSync(path.join(ROOT, 'src/pages', file), 'utf8');
  const body = source
    .replace(/<head[\s\S]*?<\/head>/i, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  const simpleElement =
    /<(h[1-6]|p|li|label|button|span|option|small|strong|summary)\b([^>]*)>([^<]+)<\/\1>/gi;
  for (const match of body.matchAll(simpleElement)) {
    const [, tag, attributes, text] = match;
    if (/data-i18n\b/.test(attributes)) continue;
    add(file, 'text', tag, text);
  }
  const attributes = /<(input|button|select|textarea)\b([^>]*?)>/gi;
  for (const match of body.matchAll(attributes)) {
    const [, tag, raw] = match;
    for (const attribute of ['placeholder', 'title']) {
      const value = raw.match(new RegExp(`${attribute}="([^"]+)"`, 'i'))?.[1];
      if (value && !new RegExp(`data-i18n-${attribute}=`).test(raw)) {
        add(file, attribute, tag, value);
      }
    }
  }
}

for (const entry of entries) {
  if (process.argv.includes('--stats')) continue;
  console.log(`${entry.file}\t${entry.kind}\t${entry.tag}\t${entry.text}`);
}

if (process.argv.includes('--stats')) {
  const flatten = (value, prefix = '', output = new Map()) => {
    for (const [key, child] of Object.entries(value)) {
      const current = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') output.set(normalize(child), current);
      else flatten(child, current, output);
    }
    return output;
  };
  const common = flatten(
    JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/locales/en/common.json'))
    )
  );
  const tools = flatten(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'public/locales/en/tools.json')))
  );
  const unique = [...new Set(entries.map((entry) => entry.text))];
  const unmatched = unique.filter(
    (text) => !common.has(text) && !tools.has(text)
  );
  console.log(`entries=${entries.length}`);
  console.log(`unique=${unique.length}`);
  console.log(
    `commonMatches=${unique.filter((text) => common.has(text)).length}`
  );
  console.log(
    `toolsMatches=${unique.filter((text) => !common.has(text) && tools.has(text)).length}`
  );
  console.log(`unmatched=${unmatched.length}`);
  for (const text of unmatched) console.log(text);
} else {
  console.log(`---\n${entries.length} untranslated simple HTML entries`);
}
