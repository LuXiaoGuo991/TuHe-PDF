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
    expect(files.filter((f) => f.startsWith('src/partials/')).length).toBe(6);
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
