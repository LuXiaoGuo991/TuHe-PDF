import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const files = process.argv.slice(2);

if (files.length === 0) {
  console.error(
    'Usage: node scripts/i18n-sanitize-alert-errors.mjs <ts-file> [...]'
  );
  process.exit(1);
}

function hasRawErrorDetail(node, sourceFile) {
  const text = node.getText(sourceFile);
  if (
    /\.(?:message|error)\b|\binstanceof\s+Error\b|\bString\((?:e|err|error)\)|\bdata\.message\b/.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

function isInsideCatchClause(node) {
  let current = node.parent;
  while (current) {
    if (ts.isCatchClause(current)) return true;
    current = current.parent;
  }
  return false;
}

function importPath(file) {
  return path.dirname(file).split('/').filter(Boolean).length > 2
    ? '../i18n/i18n'
    : './i18n/i18n';
}

function ensureTranslateHelper(source, file) {
  if (/\bconst translate\s*=/.test(source)) return source;
  const helper = `import { t } from '${importPath(file)}';\n\nconst translate = (\n  key: string,\n  fallback: string,\n  options?: Record<string, unknown>\n) => {\n  const value = t(key, options);\n  return value && value !== key ? value : fallback;\n};\n\n`;
  return `${helper}${source}`;
}

let replacementCount = 0;
const touched = [];

for (const requestedFile of files) {
  const file = requestedFile.replace(/\\/g, '/');
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const source = original.replace(/\r\n/g, '\n');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true
  );
  const edits = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'showAlert' &&
      node.arguments[1] &&
      (hasRawErrorDetail(node.arguments[1], sourceFile) ||
        (isInsideCatchClause(node) &&
          ts.isIdentifier(node.arguments[1]) &&
          /^(?:message|errorMessage|msg)$/.test(node.arguments[1].text)))
    ) {
      const message = node.arguments[1];
      edits.push({
        start: message.getStart(sourceFile),
        end: message.getEnd(),
        replacement:
          "translate('alert.processFailed', 'Processing failed. Please try again.')",
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  const unique = edits
    .sort((a, b) => b.start - a.start)
    .filter(
      (edit, index, all) => index === 0 || edit.start !== all[index - 1].start
    );
  if (unique.length === 0) continue;

  let next = source;
  for (const edit of unique) {
    next = `${next.slice(0, edit.start)}${edit.replacement}${next.slice(edit.end)}`;
  }
  next = ensureTranslateHelper(next, file);
  fs.writeFileSync(filePath, next.replace(/\n/g, eol));
  replacementCount += unique.length;
  touched.push(`${file} (${unique.length})`);
}

console.log(`✔ 已脱敏 ${replacementCount} 个错误提示：${touched.join(', ')}`);
