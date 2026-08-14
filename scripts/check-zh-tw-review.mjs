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
 *   2. 插值占位符（`{{...}}`）是否符合英文运行时参数契约与显式豁免。
 *   3. HTML 标记（`<tag>`）在 zh-TW 与 en 之间是否一致。
 *   4. 快捷键 token（Ctrl / ⌘ / Shift / Enter …）是否被翻译破坏。
 *
 * OpenCC 仅用于生成候选 diff，绝不自动覆盖已人工确认的文本——本脚本不写入任何
 * locale 文件，只输出审计结果。
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = path.join(ROOT, 'public', 'locales');
const MANIFEST = path.join(ROOT, 'docs', 'zh-TW-review-manifest.json');
const CHECKLIST = path.join(ROOT, 'docs', 'zh-TW-review-checklist.md');
const structureOnly = process.argv.includes('--structure-only');

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

const SHORTCUT_SYMBOLS = ['⌘', '⌥', '⇧', '⌫', '⌦', '↑', '↓', '←', '→'];

function shortcutTokens(value) {
  const found = new Set(
    SHORTCUT_SYMBOLS.filter((token) => value.includes(token))
  );
  const canonical = new Map(
    [
      'Ctrl',
      'Cmd',
      'Alt',
      'Option',
      'Shift',
      'Enter',
      'Tab',
      'Esc',
      'Escape',
      'Backspace',
      'Space',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].map((token) => [token.toLowerCase(), token])
  );
  const addNamedTokens = (text) => {
    for (const token of text.match(/[A-Za-z]+/g) ?? []) {
      const normalized = canonical.get(token.toLowerCase());
      if (normalized) found.add(normalized);
    }
  };

  for (const match of value.matchAll(
    /\b(?:Ctrl|Cmd|Alt|Option|Shift)(?:\s*\+\s*(?:Ctrl|Cmd|Alt|Option|Shift|Enter|Tab|Esc|Escape|Backspace|Space|Home|End|PageUp|PageDown|[A-Z0-9]))+/gi
  )) {
    addNamedTokens(match[0]);
  }
  for (const match of value.matchAll(
    /\b(?:press|hit)\s+(Enter|Tab|Esc|Escape|Backspace|Space|Home|End|PageUp|PageDown)\b/gi
  )) {
    addNamedTokens(match[1]);
  }
  for (const match of value.matchAll(/\b(?:Ctrl|Cmd|Esc|Backspace)\b/gi)) {
    addNamedTokens(match[0]);
  }

  return [...found];
}

function parseChecklist(markdown) {
  const rows = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length !== 5 || !/^\d+$/.test(cells[1])) continue;
    rows.set(cells[0], {
      keyCount: Number(cells[1]),
      status: cells[2],
      reviewer: cells[3],
      reviewedAt: cells[4],
    });
  }
  return rows;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function validateReleaseApproval(approval, issues) {
  if (!approval) return false;
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    issues.push('manifest.releaseApproval 必须是对象');
    return false;
  }
  if (approval.approved !== true) {
    issues.push('manifest.releaseApproval.approved 必须为 true');
  }
  if (typeof approval.approvedBy !== 'string' || !approval.approvedBy.trim()) {
    issues.push('manifest.releaseApproval 缺少确认人');
  }
  if (!isIsoDate(approval.approvedAt)) {
    issues.push('manifest.releaseApproval 确认日期格式错误');
  }
  if (typeof approval.scope !== 'string' || !approval.scope.trim()) {
    issues.push('manifest.releaseApproval 缺少确认范围');
  }
  if (typeof approval.basis !== 'string' || !approval.basis.trim()) {
    issues.push('manifest.releaseApproval 缺少确认依据');
  }
  return (
    approval.approved === true &&
    typeof approval.approvedBy === 'string' &&
    approval.approvedBy.trim() &&
    isIsoDate(approval.approvedAt) &&
    typeof approval.scope === 'string' &&
    approval.scope.trim() &&
    typeof approval.basis === 'string' &&
    approval.basis.trim()
  );
}

// Chinese does not render English plural suffixes, and this one tool name is
// already expressed by the surrounding localized noun phrase.
const APPROVED_PLACEHOLDER_OMISSIONS = new Map([
  ['batesNumbering.dynamic.c29f451ac2', new Set(['value1'])],
  ['addBlankPage.dynamic.3f3a8dab5a', new Set(['value0'])],
  ['addBlankPage.dynamic.7dffb09a71', new Set(['value1'])],
  ['addBlankPage.dynamic.bae7d9dce8', new Set(['value1'])],
  ['emailToPdf.dynamic.e2b1b6aa34', new Set(['value0'])],
]);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const reviewRecords = manifest.reviewedNamespaces ?? {};
const reviewed = new Set(
  reviewRecords && !Array.isArray(reviewRecords)
    ? Object.keys(reviewRecords)
    : []
);
const checklist = parseChecklist(fs.readFileSync(CHECKLIST, 'utf8'));

const twTools = flatten(loadJson('zh-TW', 'tools'));
const enTools = flatten(loadJson('en', 'tools'));

const issues = [];
let reviewedKeys = 0;
const releaseApproved = validateReleaseApproval(
  manifest.releaseApproval,
  issues
);

if (
  !reviewRecords ||
  Array.isArray(reviewRecords) ||
  typeof reviewRecords !== 'object'
) {
  issues.push('manifest.reviewedNamespaces 必须是带复核元数据的对象');
}

const namespaceKeyCounts = new Map();
for (const key of Object.keys(twTools)) {
  const namespace = topNamespace(key);
  namespaceKeyCounts.set(
    namespace,
    (namespaceKeyCounts.get(namespace) ?? 0) + 1
  );
}

for (const [namespace, keyCount] of namespaceKeyCounts) {
  const row = checklist.get(namespace);
  if (!row) {
    issues.push(`复核清单缺少命名空间: ${namespace}`);
  } else if (row.keyCount !== keyCount) {
    issues.push(
      `复核清单键数不一致: ${namespace} (${row.keyCount} != ${keyCount})`
    );
  }
}
for (const namespace of checklist.keys()) {
  if (!namespaceKeyCounts.has(namespace)) {
    issues.push(`复核清单包含未知命名空间: ${namespace}`);
  }
}

const reviewedDates = [];
for (const [namespace, record] of Object.entries(reviewRecords)) {
  const row = checklist.get(namespace);
  const keyCount = namespaceKeyCounts.get(namespace);
  if (keyCount === undefined) {
    issues.push(`manifest 包含未知命名空间: ${namespace}`);
    continue;
  }
  if (!row) {
    issues.push(`manifest 命名空间不在复核清单中: ${namespace}`);
    continue;
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    issues.push(`复核记录格式错误: ${namespace}`);
    continue;
  }
  if (record.keyCount !== keyCount) {
    issues.push(`manifest 键数不一致: ${namespace}`);
  }
  if (typeof record.reviewer !== 'string' || !record.reviewer.trim()) {
    issues.push(`manifest 缺少复核人: ${namespace}`);
  }
  if (!isIsoDate(record.reviewedAt)) {
    issues.push(`manifest 复核日期格式错误: ${namespace}`);
  } else {
    reviewedDates.push(record.reviewedAt);
  }
  if (!row.status.includes('✅')) {
    issues.push(`清单未标记为已复核: ${namespace}`);
  }
  if (
    row.reviewer !== record.reviewer ||
    row.reviewedAt !== record.reviewedAt
  ) {
    issues.push(`清单与 manifest 复核元数据不一致: ${namespace}`);
  }
}
const expectedLastReviewed = reviewedDates.sort().at(-1) ?? null;
if (manifest.lastReviewed !== expectedLastReviewed) {
  issues.push(
    `manifest.lastReviewed 不一致: ${manifest.lastReviewed ?? 'null'} != ${expectedLastReviewed ?? 'null'}`
  );
}
for (const [namespace, row] of checklist) {
  if (row.status.includes('✅') && !reviewed.has(namespace)) {
    issues.push(`清单已完成但 manifest 未登记: ${namespace}`);
  }
}

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

if (!structureOnly && uncoveredNamespaces.size > 0 && !releaseApproved) {
  issues.push(
    `未复核命名空间 ${uncoveredNamespaces.size} 个（${totalKeys - reviewedKeys} 键未落入已完成批次）`
  );
}

// 2. 插值占位符一致性（zh-TW 对照英文运行时参数契约）。
for (const key of Object.keys(twTools)) {
  const tw = twTools[key];
  const en = enTools[key];
  if (typeof tw !== 'string') continue;

  const twPh = placeholders(tw);
  const enPh = placeholders(typeof en === 'string' ? en : '');
  const approvedOmissions =
    APPROVED_PLACEHOLDER_OMISSIONS.get(key) ?? new Set();
  const expectedPh = new Set(
    [...enPh].filter((placeholder) => !approvedOmissions.has(placeholder))
  );
  if (
    twPh.size !== expectedPh.size ||
    [...twPh].some((p) => !expectedPh.has(p)) ||
    [...expectedPh].some((p) => !twPh.has(p))
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

if (structureOnly) {
  console.log(
    `\nzh-TW 结构门控通过；人工复核进度 ${reviewedKeys}/${totalKeys} 键。`
  );
} else if (releaseApproved) {
  console.log(
    `\nzh-TW 发布门控通过：${manifest.releaseApproval.approvedBy} 已于 ${manifest.releaseApproval.approvedAt} 确认 ${manifest.releaseApproval.scope}。`
  );
} else {
  console.log('\nzh-TW 人工复核门控通过：所有键已复核且结构一致。');
}
