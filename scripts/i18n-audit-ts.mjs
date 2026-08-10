// 审计：统计 src/js 下仍疑似硬编码的英文用户文案（未走 translate() 的）
import fs from 'fs';
import path from 'path';

const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.ts')) files.push(p);
  }
};
walk('src/js');

const pat =
  /(?:showAlert|showToast|showLoader)\(\s*['"`][A-Z]|textContent\s*=\s*['"`][A-Z]|placeholder\s*=\s*['"`][A-Z]|\.title\s*=\s*['"`][A-Z]/g;

const perFile = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const hasT = /i18n\/index\.js/.test(s);
  const hits = s.match(pat) || [];
  if (hits.length)
    perFile.push([f.split(path.sep).join('/'), hits.length, hasT]);
}
perFile.sort((a, b) => b[1] - a[1]);
let total = 0;
for (const [f, n, hasT] of perFile) {
  total += n;
  console.log(String(n).padStart(3), hasT ? '[已引入t]' : '', f);
}
console.log('---');
console.log(`共 ${total} 处疑似硬编码，分布在 ${perFile.length} 个 TS 文件`);
console.log(`其中已引入 i18n 的文件: ${perFile.filter((x) => x[2]).length} 个`);
