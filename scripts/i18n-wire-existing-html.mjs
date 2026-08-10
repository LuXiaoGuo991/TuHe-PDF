import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_DIR = path.join(ROOT, 'src/pages');
const excluded = new Set([
  'merge-pdf.html',
  'split-pdf.html',
  'compress-pdf.html',
  'jpg-to-pdf.html',
  'edit-pdf.html',
  'sign-pdf.html',
]);
const normalize = (value) => value.replace(/\s+/g, ' ').trim();

const flatten = (value, prefix = '', output = new Map()) => {
  for (const [key, child] of Object.entries(value)) {
    const current = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      const text = normalize(child);
      const candidates = output.get(text) ?? [];
      candidates.push(current);
      output.set(text, candidates);
    } else {
      flatten(child, current, output);
    }
  }
  return output;
};

const common = flatten(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'public/locales/en/common.json')))
);
const tools = flatten(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'public/locales/en/tools.json')))
);
const pickKey = (text, toolName) => {
  const commonMatch = common.get(text)?.[0];
  if (commonMatch) return { namespace: 'common', key: commonMatch };
  const candidates = tools.get(text) ?? [];
  const key =
    candidates.find((candidate) => candidate.startsWith(`${toolName}.`)) ??
    candidates[0];
  return key ? { namespace: 'tools', key } : undefined;
};
const additions = new Map();
const add = (file, old, replacement) => {
  const fileEdits = additions.get(file) ?? new Map();
  const current = fileEdits.get(old);
  if (current && current.replacement !== replacement) {
    throw new Error(`${file}: 同一原文片段对应多个翻译键`);
  }
  fileEdits.set(old, {
    replacement,
    expected: (current?.expected ?? 0) + 1,
  });
  additions.set(file, fileEdits);
};

for (const file of fs.readdirSync(PAGE_DIR)) {
  if (!file.endsWith('.html') || excluded.has(file)) continue;
  const source = fs.readFileSync(path.join(PAGE_DIR, file), 'utf8');
  const toolName = source.match(/data-i18n="tools:([^.]+)\.name"/)?.[1];
  if (!toolName) continue;
  const body = source
    .replace(/<head[\s\S]*?<\/head>/i, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  const simpleElement =
    /<(h[1-6]|p|li|label|button|span|option|small|strong)\b([^>]*)>([^<]+)<\/\1>/gi;
  for (const match of body.matchAll(simpleElement)) {
    const [old, tag, attributes, text] = match;
    if (/data-i18n\b/.test(attributes)) continue;
    const translation = pickKey(normalize(text), toolName);
    if (!translation) continue;
    const i18nKey =
      translation.namespace === 'tools'
        ? `tools:${translation.key}`
        : translation.key;
    add(
      file,
      old,
      `<${tag}${attributes} data-i18n="${i18nKey}">${text}</${tag}>`
    );
  }
  const attributes = /<(input|button|select|textarea)\b([^>]*?)>/gi;
  for (const match of body.matchAll(attributes)) {
    const [old, tag, raw] = match;
    for (const attribute of ['placeholder', 'title']) {
      const value = raw.match(new RegExp(`${attribute}="([^"]+)"`, 'i'))?.[1];
      if (!value || new RegExp(`data-i18n-${attribute}=`).test(raw)) continue;
      const translation = pickKey(value, toolName);
      if (!translation) continue;
      const i18nKey =
        translation.namespace === 'tools'
          ? `tools:${translation.key}`
          : translation.key;
      add(
        file,
        old,
        old.replace(
          `${attribute}="${value}"`,
          `${attribute}="${value}" data-i18n-${attribute}="${i18nKey}"`
        )
      );
    }
  }
}

const pending = new Map();
let errors = 0;
for (const [file, edits] of additions) {
  const absolute = path.join(PAGE_DIR, file);
  let source = fs.readFileSync(absolute, 'utf8');
  let count = 0;
  for (const [old, { replacement, expected }] of edits) {
    const found = source.split(old).length - 1;
    if (found !== expected) {
      console.error(
        `✘ ${file}: 期望 ${expected} 处，实际 ${found} 处：${JSON.stringify(normalize(old).slice(0, 80))}`
      );
      errors++;
      continue;
    }
    source = source.split(old).join(replacement);
    count += found;
  }
  console.log(`✔ ${file}: ${count} 处已有键接线已就绪`);
  pending.set(absolute, source);
}

if (errors > 0) {
  console.error('校验失败，未写入任何文件');
  process.exit(1);
}
if (pending.size === 0) {
  console.log('没有可接线的已有翻译键。');
  process.exit(0);
}
for (const [absolute, source] of pending) fs.writeFileSync(absolute, source);
console.log(`✔ 已写入 ${pending.size} 个页面。`);
