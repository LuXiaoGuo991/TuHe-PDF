const fs = require('fs');
const file = 'public/locales/zh/tools.json';
let content = fs.readFileSync(file, 'utf-8');

// Fix the corrupted lines by replacing them
const fixes = {
  '"annotationActionWithLabel": "{{action}} {{subtype}} 注释："{{label}}""':
    '"annotationActionWithLabel": "{{action}} {{subtype}} 注释：\\"{{label}}\\""',
  '"textReplaced": "已将"{{before}}"替换为"{{after}}""':
    '"textReplaced": "已将\\"{{before}}\\"替换为\\"{{after}}\\""',
  '"textRemoved": "已移除"{{text}}""': '"textRemoved": "已移除\\"{{text}}\\""',
  '"textAdded": "已添加"{{text}}""': '"textAdded": "已添加\\"{{text}}\\""',
  '"textMoved": "已移动"{{text}}""': '"textMoved": "已移动\\"{{text}}\\""',
};

for (const [bad, good] of Object.entries(fixes)) {
  content = content.replace(bad, good);
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed');

// Validate
try {
  JSON.parse(content);
  console.log('VALID JSON');
} catch (e) {
  console.log('INVALID:', e.message);
}
