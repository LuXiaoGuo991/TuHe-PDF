import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/js/logic/excel-to-pdf-page.ts',
  'src/js/logic/odg-to-pdf-page.ts',
  'src/js/logic/odp-to-pdf-page.ts',
  'src/js/logic/ods-to-pdf-page.ts',
  'src/js/logic/odt-to-pdf-page.ts',
  'src/js/logic/pages-to-pdf-page.ts',
  'src/js/logic/powerpoint-to-pdf-page.ts',
  'src/js/logic/pub-to-pdf-page.ts',
  'src/js/logic/rtf-to-pdf-page.ts',
  'src/js/logic/vsd-to-pdf-page.ts',
  'src/js/logic/word-to-pdf-page.ts',
  'src/js/logic/wpd-to-pdf-page.ts',
  'src/js/logic/wps-to-pdf-page.ts',
];
const from = 'showLoader(progress.message, progress.percent);';
const to =
  "showLoader(translate('loader.processing', 'Processing...'), progress.percent);";

const prepared = [];
for (const file of files) {
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const source = original.replace(/\r\n/g, '\n');
  const sourceCount = source.split(from).length - 1;
  const targetCount = source.split(to).length - 1;
  if (targetCount === 1) {
    prepared.push([filePath, original]);
    continue;
  }
  if (sourceCount !== 1) {
    throw new Error(`${file}: expected 1 source match, got ${sourceCount}`);
  }
  prepared.push([filePath, source.replace(from, to).replace(/\n/g, eol)]);
}

for (const [filePath, source] of prepared) fs.writeFileSync(filePath, source);
console.log(`✔ 已接线 ${files.length} 个转换器进度提示。`);
