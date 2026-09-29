import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  toPosix,
  collectIssues,
  collectHtmlFiles,
  migrate,
  EXEMPTIONS,
  isWholeFileExempt,
} from '../../scripts/migrate-visual-batch.mjs';

// vitest 从仓库根启动（同 vitest.config.ts 的 process.cwd() 约定）。
const REPO_ROOT = process.cwd();

describe('toPosix', () => {
  it('converts Windows separators to /', () => {
    expect(toPosix('src\\pages\\compare-pdfs.html')).toBe(
      'src/pages/compare-pdfs.html'
    );
  });

  it('leaves POSIX paths unchanged', () => {
    expect(toPosix('src/pages/compare-pdfs.html')).toBe(
      'src/pages/compare-pdfs.html'
    );
  });
});

describe('collectHtmlFiles (扫描范围)', () => {
  const files = collectHtmlFiles().map((f) =>
    toPosix(path.relative(REPO_ROOT, f))
  );

  it('覆盖 src/pages/**（115 个工具页）', () => {
    expect(files).toContain('src/pages/merge-pdf.html');
    expect(files.filter((f) => f.startsWith('src/pages/')).length).toBe(115);
  });

  it('覆盖 src/partials/**（站点 partial）', () => {
    expect(files).toContain('src/partials/footer.html');
    expect(files).toContain('src/partials/footer-simple.html');
    expect(files).toContain('src/partials/navbar-simple.html');
    // 2026-09-28 起为 7 个（含 ambient-bg / navbar / settings-modal / warning-modal）。
    expect(files.filter((f) => f.startsWith('src/partials/')).length).toBe(7);
  });

  it('覆盖仓库根 *.html（含 index.html）', () => {
    for (const name of [
      'index.html',
      '404.html',
      'about.html',
      'contact.html',
      'privacy.html',
      'terms.html',
      'licensing.html',
    ]) {
      expect(files).toContain(name);
    }
  });

  it('不含重复项', () => {
    expect(new Set(files).size).toBe(files.length);
  });
});

describe('collectIssues', () => {
  it('reports unapproved hex colors in <style>', () => {
    const html = '<style>.foo { color: #ff0000; }</style>';
    const issues = collectIssues('src/pages/foo.html', html);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].value).toBe('#ff0000');
  });

  it('reports unapproved rgb()/rgba() in inline style', () => {
    const html = '<div id="x" style="color: rgb(1, 2, 3)"></div>';
    const issues = collectIssues('src/pages/foo.html', html);
    expect(issues.some((i) => i.value.startsWith('rgb('))).toBe(true);
  });

  it('exempts --compare-* custom properties in compare-pdfs.html', () => {
    const html =
      '<style>:root { --compare-paper: #ffffff; --compare-added: rgba(34,197,94,0.28); }</style>';
    expect(collectIssues('src/pages/compare-pdfs.html', html)).toHaveLength(0);
  });

  it('exempts var() fallback colors for --cat-color in pdf-workflow.html', () => {
    const html =
      '<style>.wf-card { border: 2px solid var(--cat-color, #6b7280); }</style>';
    expect(collectIssues('src/pages/pdf-workflow.html', html)).toHaveLength(0);
  });

  it('exempts a selector-matched inline style', () => {
    const html =
      '<div id="pdfCanvasWrapper" style="border: 1px solid #374151"></div>';
    expect(collectIssues('src/pages/form-creator.html', html)).toHaveLength(0);
  });

  it('fails when a color outside exemptions appears in an exempted file', () => {
    const html =
      '<style>:root { --compare-paper: #ffffff; --leak: #123456; }</style>';
    const issues = collectIssues('src/pages/compare-pdfs.html', html);
    expect(issues.some((i) => i.value === '#123456')).toBe(true);
  });

  it('exempts a color family only in its own file', () => {
    const ts = "const c = 'border-gray-300 text-gray-600';";
    expect(collectIssues('src/js/logic/form-creator.ts', ts)).toHaveLength(0);
    expect(collectIssues('src/js/logic/other.ts', ts).length).toBeGreaterThan(
      0
    );
  });

  // 回归：`tailwindIssues()` 收到的是 class 属性值（无引号），因此属性里
  // 最后一个颜色类永远以字符串结尾收尾，尾界定必须接受 `$`。
  it('detects a palette class that ends the class attribute', () => {
    expect(
      collectIssues('probe.html', '<div class="text-gray-400">x</div>').map(
        (i) => i.value
      )
    ).toEqual(['text-gray-400']);
    expect(
      collectIssues(
        'probe.html',
        '<div class="bg-gray-800 text-gray-300">x</div>'
      ).map((i) => i.value)
    ).toEqual(['bg-gray-800', 'text-gray-300']);
  });

  // 回归：属性前缀表曾漏掉 ring-offset / shadow，色相泄漏不被检测。
  it('detects ring-offset-* and shadow-* palette leaks', () => {
    const html =
      '<a class="focus:ring-offset-gray-900 hover:shadow-indigo-500/30 focus:ring-gray-700">x</a>';
    expect(collectIssues('probe.html', html).map((i) => i.value)).toEqual([
      'focus:ring-offset-gray-900',
      'hover:shadow-indigo-500/30',
      'focus:ring-gray-700',
    ]);
  });
});

describe('whole-file 豁免', () => {
  it('svg-repair.html 整文件豁免（非构建产物的独立工具页）', () => {
    expect(isWholeFileExempt('svg-repair.html')).toBe(true);
    const html = '<style>:root { --ink: #18231c; --paper: #f4f2ea; }</style>';
    expect(collectIssues('svg-repair.html', html)).toHaveLength(0);
  });

  // 守住边界：整文件豁免只能落在非站点面的独立工具页上。
  it('站点面（src/pages、src/partials、已发布根站点页）不得整文件豁免', () => {
    const wholeFile = EXEMPTIONS.filter((ex) => ex.wholeFile).map(
      (ex) => ex.file
    );
    expect(wholeFile).toEqual(['svg-repair.html']);
    for (const file of wholeFile) {
      expect(file.startsWith('src/pages/')).toBe(false);
      expect(file.startsWith('src/partials/')).toBe(false);
      expect(file.includes('/')).toBe(false);
    }
  });

  it('未豁免的根站点页仍会被检测', () => {
    const html = '<body class="antialiased bg-gray-900 text-gray-300">';
    expect(collectIssues('about.html', html).length).toBeGreaterThan(0);
  });
});

describe('migrate', () => {
  it('replaces gray/indigo utility classes with ui-* classes', () => {
    const html = '<div class="bg-gray-900 text-gray-300 border-gray-700">';
    const out = migrate(html, true);
    expect(out).toContain('ui-bg-canvas');
    expect(out).toContain('ui-text-secondary');
    expect(out).toContain('ui-border-subtle');
  });

  it('默认不注入工具页标记（partial / 站点页安全）', () => {
    const html = '<body class="antialiased bg-gray-900">';
    const out = migrate(html, true);
    expect(out).not.toContain('phase2-tool-page');
    expect(out).toContain('<body class="antialiased ui-bg-canvas">');
  });

  it('只有 toolPage=true 才注入 phase2-tool-page', () => {
    const html = '<body class="antialiased bg-gray-900">';
    const out = migrate(html, true, { toolPage: true });
    expect(out).toContain('<body class="phase2-tool-page antialiased');
  });

  // 回归（ADR 0005 按钮四档体系）：注入规则不得给已收敛的新体系角色类
  // 再叠旧类——btn-gradient 独立成主按钮档、ui-segment-btn 为分段控件段钮
  // （激活态由 JS 切 ui-bg-* 工具类）、ui-button-ghost 为幽灵/图标档。
  it('btn-gradient 按钮不再被注入 ui-button-secondary（独立主按钮档）', () => {
    const html = '<button id="p" class="btn-gradient w-full mt-6">Go</button>';
    expect(migrate(html, true, { toolPage: true })).toBe(html);
  });

  it('ui-segment-btn 段钮不被注入任何 ui-button-* 角色类', () => {
    const html =
      '<button class="ui-segment-btn flex-1 py-2 ui-bg-action ui-text-primary">A</button>' +
      '<button class="ui-segment-btn flex-1 py-2 ui-bg-raised ui-text-secondary">B</button>';
    expect(migrate(html, true, { toolPage: true })).toBe(html);
  });

  it('无角色类的遗留按钮仍会被兜底注入 ui-button-secondary（旧页面不回退）', () => {
    const html = '<button id="x" class="px-4 py-2">OK</button>';
    const out = migrate(html, true, { toolPage: true });
    expect(out).toContain('class="ui-button-secondary px-4 py-2"');
  });

  it('ui-bg-action 遗留按钮仍被注入 ui-button-primary，但段钮除外', () => {
    const legacy =
      '<button id="a" class="px-4 py-2 ui-bg-action ui-text-primary">Add</button>';
    expect(migrate(legacy, true, { toolPage: true })).toContain(
      'class="ui-button-primary px-4 py-2 ui-bg-action ui-text-primary"'
    );
    const seg =
      '<button class="ui-segment-btn py-2 ui-bg-action">Mode</button>';
    expect(migrate(seg, true, { toolPage: true })).toBe(seg);
  });
});

describe('站点面回归（9 个文件）', () => {
  const SITE_SURFACE = [
    '404.html',
    'about.html',
    'contact.html',
    'licensing.html',
    'privacy.html',
    'terms.html',
    'src/partials/footer.html',
    'src/partials/footer-simple.html',
    'src/partials/navbar-simple.html',
  ];

  it('不含任何未批准的旧色板颜色，且 migrate() 为幂等空操作', () => {
    for (const rel of SITE_SURFACE) {
      const content = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      const isHtml = rel.endsWith('.html');
      const issues = collectIssues(rel, content);
      expect(
        issues.map((i) => `${i.value}@${rel}`),
        `${rel} 仍有旧色板颜色`
      ).toEqual([]);
      expect(migrate(content, isHtml), `${rel} 仍会被 migrate 改动`).toBe(
        content
      );
    }
  });
});
