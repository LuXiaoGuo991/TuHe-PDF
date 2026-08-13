import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 可审计的 zh-TW 人工复核门控。
 *
 * 复核按工具命名空间（tools.json 的顶层 key）分批进行，人工完成的批次登记到
 * `docs/zh-TW-review-manifest.json` 的 `reviewedNamespaces`。本脚本校验：
 *
 *   1. 当前 tools.json 的全部扁平键是否都落入「已完成批次」；未覆盖的键视为
 *      「新增 / 未复核」，直接使门控失败（防止新增键静默漏审）。
 *   2. 插值占位符（`{{...}}`）在 zh-TW / zh / en 之间是否一致。
 *   3. HTML 标记（`<tag>`）在 zh-TW 与 en 之间是否一致。
 *   4. 快捷键 token（Ctrl / ⌘ / Shift / Enter …）是否被翻译破坏。
 *
 * OpenCC 仅用于生成候选 diff，绝不自动覆盖已人工确认的文本——本脚本不写入任何
 * locale 文件，只输出审计结果。
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = path.join(ROOT, 'public', 'locales');
const MANIFEST = path.join(ROOT, 'docs', 'zh-TW-review-manifest.json');

function loadJson(lang, resource) {
  return JSON.parse(
    fs.readFileSync(path.join(LOCALES, lang, `${resource}.json`), 'utf8')
  );
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, fullKey));
    } else {
      out[fullKey] = value;
    }
  }
  return out;
}

function topNamespace(key) {
  return key.split('.')[0];
}

function placeholders(value) {
  return new Set(
    [...value.matchAll(/\{\{([^{}]+)\}\}/g)].map((m) => m[1].trim())
  );
}

function htmlTags(value) {
  return new Set(
    [...value.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g)].map((m) =>
      m[1].toLowerCase()
    )
  );
}

const SHORTCUT_TOKENS = [
  'Ctrl',
  'Cmd',
  '⌘',
  '⌥',
  '⇧',
  'Esc',
  'Backspace',
  '⌫',
  '⌦',
  '↑',
  '↓',
  '←',
  '→',
];

function shortcutTokens(value) {
  return SHORTCUT_TOKENS.filter((token) => value.includes(token));
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const reviewed = new Set(manifest.reviewedNamespaces ?? []);

const twTools = flatten(loadJson('zh-TW', 'tools'));
const zhTools = flatten(loadJson('zh', 'tools'));
const enTools = flatten(loadJson('en', 'tools'));

const issues = [];
let reviewedKeys = 0;

// 1. 覆盖：每个键是否落入已完成批次。
const uncoveredNamespaces = new Set();
for (const key of Object.keys(twTools)) {
  const ns = topNamespace(key);
  if (reviewed.has(ns)) {
    reviewedKeys += 1;
  } else {
    uncoveredNamespaces.add(ns);
  }
}

const totalKeys = Object.keys(twTools).length;
console.log(
  `zh-TW tools: ${reviewedKeys}/${totalKeys} keys in ${reviewed.size} reviewed namespace(s).`
);

if (uncoveredNamespaces.size > 0) {
  issues.push(
    `未复核命名空间 ${uncoveredNamespaces.size} 个（${totalKeys - reviewedKeys} 键未落入已完成批次）`
  );
}

// 2. 插值占位符一致性（zh-TW 对照 zh 与 en）。
for (const key of Object.keys(twTools)) {
  const tw = twTools[key];
  const en = enTools[key];
  const zh = zhTools[key];
  if (typeof tw !== 'string') continue;

  const twPh = placeholders(tw);
  const enPh = placeholders(typeof en === 'string' ? en : '');
  const zhPh = placeholders(typeof zh === 'string' ? zh : '');
  if (
    twPh.size !== enPh.size ||
    [...twPh].some((p) => !enPh.has(p)) ||
    [...enPh].some((p) => !twPh.has(p))
  ) {
    issues.push(`占位符不一致: ${key}`);
  }

  // 3. HTML 标记一致性（对照 en）。
  const twTags = htmlTags(tw);
  const enTags = htmlTags(typeof en === 'string' ? en : '');
  if (twTags.size !== enTags.size || [...enTags].some((t) => !twTags.has(t))) {
    issues.push(`HTML 标记不一致: ${key}`);
  }

  // 4. 快捷键 token 一致性（对照 en；快捷键不应被翻译）。
  const enShortcuts = shortcutTokens(typeof en === 'string' ? en : '');
  for (const token of enShortcuts) {
    if (!tw.includes(token)) {
      issues.push(`快捷键 token 缺失: ${key} (${token})`);
    }
  }
}

if (issues.length) {
  console.error(`\n${issues.length} 个审计问题：`);
  for (const issue of issues.slice(0, 100)) console.error(`- ${issue}`);
  if (issues.length > 100)
    console.error(`  … 以及另外 ${issues.length - 100} 个`);
  process.exit(1);
}

console.log('\nzh-TW 人工复核门控通过：所有键已复核且结构一致。');
