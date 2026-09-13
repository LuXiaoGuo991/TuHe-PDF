import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * zh-TW 结构门控。
 *
 * 只有「结构契约」参与退出码；人工复核台账（`docs/zh-TW-review-manifest.json` 与
 * `docs/zh-TW-review-checklist.md`）**仅作提示输出，永不参与退出码**。
 *
 * 原因：`docs/` 是本地目录、不进版本控制（见 `.gitignore`），干净检出时这两个文件
 * 都不存在。台账缺失、解析失败或与 locale 文件不一致，都不应阻断 `npm run build`。
 *
 * 致命校验（issues，非空则 exit 1）：
 *   1. 插值占位符（`{{...}}`）符合英文运行时参数契约与显式豁免。
 *   2. HTML 标记（`<tag>`）在 zh-TW 与 en 之间保持一致。
 *   3. 快捷键 token（Ctrl / ⌘ / Shift / Enter …）未被翻译破坏。
 *
 * 提示（notices，永不致命）：
 *   - 台账缺失 / 解析失败 / 结构不符；
 *   - `reviewedNamespaces` 与 tools.json 命名空间的键数、复核人、日期一致性；
 *   - `releaseApproval` 完整性；
 *   - 非 `--structure-only` 模式下的复核覆盖率。
 *
 * 向后兼容：`--structure-only` 仍然接受（`npm run check:zh-tw-structure` 在用），
 * 它与默认模式的差别现在只剩「不输出覆盖率提示」。
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

/** 读取本地台账文件；不存在或不可读都返回 null，绝不抛错。 */
function readTextIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** 宽松读取台账 JSON：返回 { value, reason }，失败时 value 为 null。 */
function readJsonIfExists(file) {
  const text = readTextIfExists(file);
  if (text === null) return { value: null, reason: '文件不存在' };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { value: null, reason: `JSON 解析失败（${error.message}）` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { value: null, reason: '根节点不是对象' };
  }
  return { value: parsed, reason: null };
}

/** 台账完整性巡检：只写提示，不影响退出码。 */
function inspectReleaseApproval(approval, notices) {
  if (approval === undefined) {
    notices.push('manifest 缺少 releaseApproval 字段');
    return false;
  }
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    notices.push('manifest.releaseApproval 必须是对象');
    return false;
  }
  if (approval.approved !== true) {
    notices.push('manifest.releaseApproval.approved 不为 true');
    return false;
  }
  if (typeof approval.approvedBy !== 'string' || !approval.approvedBy.trim()) {
    notices.push('manifest.releaseApproval 缺少确认人');
  }
  if (!isIsoDate(approval.approvedAt)) {
    notices.push('manifest.releaseApproval 确认日期格式错误');
  }
  if (typeof approval.scope !== 'string' || !approval.scope.trim()) {
    notices.push('manifest.releaseApproval 缺少确认范围');
  }
  if (typeof approval.basis !== 'string' || !approval.basis.trim()) {
    notices.push('manifest.releaseApproval 缺少确认依据');
  }
  return true;
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

// issues：致命，决定退出码。notices：人工复核台账提示，永不致命。
const issues = [];
const notices = [];

const manifestRead = readJsonIfExists(MANIFEST);
const manifest = manifestRead.value;
const reviewRecords =
  manifest &&
  manifest.reviewedNamespaces &&
  typeof manifest.reviewedNamespaces === 'object' &&
  !Array.isArray(manifest.reviewedNamespaces)
    ? manifest.reviewedNamespaces
    : {};
const reviewed = new Set(Object.keys(reviewRecords));

const checklistText = readTextIfExists(CHECKLIST);
const checklist = checklistText === null ? null : parseChecklist(checklistText);

if (manifest === null) {
  notices.push(
    `人工复核台账不可用（docs/zh-TW-review-manifest.json ${manifestRead.reason}），已跳过台账核对`
  );
} else if (
  // 空对象是合法状态（尚无逐命名空间复核记录），仅当形状不对时才提示。
  manifest.reviewedNamespaces !== undefined &&
  (!manifest.reviewedNamespaces ||
    typeof manifest.reviewedNamespaces !== 'object' ||
    Array.isArray(manifest.reviewedNamespaces))
) {
  notices.push('manifest.reviewedNamespaces 必须是带复核元数据的对象');
}
if (checklist === null) {
  notices.push(
    '人工复核清单不可用（docs/zh-TW-review-checklist.md 不存在），已跳过命名空间/键数核对'
  );
}

const releaseApproved = manifest
  ? inspectReleaseApproval(manifest.releaseApproval, notices)
  : false;

const twTools = flatten(loadJson('zh-TW', 'tools'));
const enTools = flatten(loadJson('en', 'tools'));

const namespaceKeyCounts = new Map();
for (const key of Object.keys(twTools)) {
  const namespace = topNamespace(key);
  namespaceKeyCounts.set(
    namespace,
    (namespaceKeyCounts.get(namespace) ?? 0) + 1
  );
}

if (checklist) {
  for (const [namespace, keyCount] of namespaceKeyCounts) {
    const row = checklist.get(namespace);
    if (!row) {
      notices.push(`复核清单缺少命名空间: ${namespace}`);
    } else if (row.keyCount !== keyCount) {
      notices.push(
        `复核清单键数不一致: ${namespace} (${row.keyCount} != ${keyCount})`
      );
    }
  }
  for (const namespace of checklist.keys()) {
    if (!namespaceKeyCounts.has(namespace)) {
      notices.push(`复核清单包含未知命名空间: ${namespace}`);
    }
  }

  const reviewedDates = [];
  for (const [namespace, record] of Object.entries(reviewRecords)) {
    const row = checklist.get(namespace);
    const keyCount = namespaceKeyCounts.get(namespace);
    if (keyCount === undefined) {
      notices.push(`manifest 包含未知命名空间: ${namespace}`);
      continue;
    }
    if (!row) {
      notices.push(`manifest 命名空间不在复核清单中: ${namespace}`);
      continue;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      notices.push(`复核记录格式错误: ${namespace}`);
      continue;
    }
    if (record.keyCount !== keyCount) {
      notices.push(`manifest 键数不一致: ${namespace}`);
    }
    if (typeof record.reviewer !== 'string' || !record.reviewer.trim()) {
      notices.push(`manifest 缺少复核人: ${namespace}`);
    }
    if (!isIsoDate(record.reviewedAt)) {
      notices.push(`manifest 复核日期格式错误: ${namespace}`);
    } else {
      reviewedDates.push(record.reviewedAt);
    }
    if (!row.status.includes('✅')) {
      notices.push(`清单未标记为已复核: ${namespace}`);
    }
    if (
      row.reviewer !== record.reviewer ||
      row.reviewedAt !== record.reviewedAt
    ) {
      notices.push(`清单与 manifest 复核元数据不一致: ${namespace}`);
    }
  }

  const expectedLastReviewed = reviewedDates.sort().at(-1) ?? null;
  if (manifest && manifest.lastReviewed !== expectedLastReviewed) {
    notices.push(
      `manifest.lastReviewed 不一致: ${manifest.lastReviewed ?? 'null'} != ${expectedLastReviewed ?? 'null'}`
    );
  }
  for (const [namespace, row] of checklist) {
    if (manifest && row.status.includes('✅') && !reviewed.has(namespace)) {
      notices.push(`清单已完成但 manifest 未登记: ${namespace}`);
    }
  }
}

// 1. 覆盖：每个键是否落入已完成批次（仅提示）。
let reviewedKeys = 0;
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
  notices.push(
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

if (notices.length) {
  console.warn(
    `\n${notices.length} 条人工复核台账提示（仅提示，不影响退出码）：`
  );
  for (const notice of notices.slice(0, 20)) console.warn(`- ${notice}`);
  if (notices.length > 20)
    console.warn(`  … 以及另外 ${notices.length - 20} 条`);
}

if (issues.length) {
  console.error(`\n${issues.length} 个结构问题：`);
  for (const issue of issues.slice(0, 100)) console.error(`- ${issue}`);
  if (issues.length > 100)
    console.error(`  … 以及另外 ${issues.length - 100} 个`);
  process.exit(1);
}

const coverage = `人工复核进度（提示）：${reviewedKeys}/${totalKeys} 键。`;
if (structureOnly) {
  console.log(`\nzh-TW 结构门控通过；${coverage}`);
} else if (releaseApproved) {
  console.log(
    `\nzh-TW 结构门控通过：台账声明 ${manifest.releaseApproval.approvedBy} 已于 ${manifest.releaseApproval.approvedAt} 确认 ${manifest.releaseApproval.scope}；${coverage}`
  );
} else {
  console.log(`\nzh-TW 结构门控通过；${coverage}`);
}
