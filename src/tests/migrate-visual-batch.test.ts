import { describe, expect, it } from 'vitest';
import {
  toPosix,
  collectIssues,
  migrate,
} from '../../scripts/migrate-visual-batch.mjs';

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
});

describe('migrate', () => {
  it('replaces gray/indigo utility classes with ui-* classes', () => {
    const html = '<div class="bg-gray-900 text-gray-300 border-gray-700">';
    const out = migrate(html, true);
    expect(out).toContain('ui-bg-canvas');
    expect(out).toContain('ui-text-secondary');
    expect(out).toContain('ui-border-subtle');
  });
});
