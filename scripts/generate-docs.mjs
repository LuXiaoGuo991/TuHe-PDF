#!/usr/bin/env node
/**
 * TuHe PDF 文档站生成器
 *
 * 读取 docs-site/**\/*.md（带简易 front-matter），渲染为套主站外壳的静态 HTML，
 * 输出到 dist/docs/，供 nginx 的 `location ^~ /docs/` 直接服务（clean URL）。
 *
 * 约定：
 * - front-matter 字段：title / description / group（start|guides）/ order（数字）
 * - 文件名即 slug：docs-site/guides/compress.md → /docs/guides/compress
 * - 正文一级标题由 front-matter 的 title 渲染，md 内请从 ## 开始
 * - 正文中链接工具页请使用根路径（如 /merge-pdf），生成时会自动改写为
 *   工作台深链（/?tool=merge-pdf），点击后在工作台标签页中打开工具；
 *   链接文档页使用 /docs/xxx
 * - 依赖主站构建产物：需先跑 `vite build`（从 dist/about.html 解析 main-[hash].css）
 * - docs 区 CSP（security-headers-docs.conf）允许 'unsafe-inline' script/style，
 *   因此主题切换与搜索脚本直接内联；所有资源保持同源
 *
 * 用法：node scripts/generate-docs.mjs   （已挂入 npm run build 链）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import { SITE_URL } from './site-config.mjs';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'docs-site');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_DIR = path.join(DIST_DIR, 'docs');

const BASE = (process.env.BASE_URL || '/').replace(/\/+$/, '') + '/';
const u = (p) => BASE + String(p).replace(/^\/+/, '');

const GROUPS = [
  { id: 'start', title: '开始使用' },
  { id: 'guides', title: '工具指南' },
];

/* ---------- front-matter ---------- */

function parseFrontmatter(raw) {
  const meta = {};
  if (!raw.startsWith('---')) return { meta, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta, body: raw };
  const block = raw.slice(3, end).replace(/^\r?\n/, '');
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body };
}

/* ---------- markdown ---------- */

const slugify = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');

function inlineText(token) {
  return (token.children || [])
    .filter((c) => c.type === 'text' || c.type === 'code_inline')
    .map((c) => c.content)
    .join('');
}

const md = new MarkdownIt({
  html: false, // 内容源可信但仍禁 raw HTML，减少注入面
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        );
      } catch {
        /* fall through */
      }
    }
    return (
      '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
    );
  },
});

// 给 h2-h6 注入 id（与 slugify 一致），h1 由外壳渲染
const defaultHeadingOpen =
  md.renderer.rules.heading_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 1];
  if (inline && inline.type === 'inline') {
    tokens[idx].attrSet('id', slugify(inlineText(inline)));
  }
  return defaultHeadingOpen(tokens, idx, options, env, self);
};

// 工具页 slug 集合：src/pages/*.html 文件名（不含扩展名）
const TOOL_SLUGS = new Set(
  fs
    .readdirSync(path.join(ROOT, 'src', 'pages'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
);

// 外链自动加 target/rel；站内工具链接改写为工作台深链（见下）
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href') || '';
  if (/^https?:\/\//.test(href)) {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
  } else {
    // 工具链接（如 /merge-pdf）改指主站工作台深链 /?tool=merge-pdf：
    // 点击后在工作台标签页中打开工具，而不是跳出文档进入无导航的独立工具页。
    // 主站 workbench.ts 初始化时消费该参数。/docs/** 与法律页（/privacy 等
    // 根级页面，不在 src/pages 下）不受影响。
    const m = href.match(/^\/([a-z0-9][a-z0-9-]*)$/);
    if (m && TOOL_SLUGS.has(m[1])) {
      tokens[idx].attrSet('href', `${BASE}?tool=${m[1]}`);
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function renderMarkdown(body) {
  const tokens = md.parse(body, {});
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3')) {
      const text = inlineText(tokens[i + 1] || {});
      headings.push({ level: t.tag === 'h2' ? 2 : 3, text, id: slugify(text) });
    }
  }
  return { html: md.renderer.render(tokens, md.options, {}), headings };
}

/* ---------- 页面收集 ---------- */

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.name.endsWith('.md')) out.push(path.relative(base, full));
  }
  return out;
}

function loadPages() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('❌ docs-site/ 不存在，跳过文档生成');
    process.exit(1);
  }
  return walk(SRC_DIR)
    .map((rel) => {
      const slug = rel.split(path.sep).join('/').replace(/\.md$/, '');
      const { meta, body } = parseFrontmatter(
        fs.readFileSync(path.join(SRC_DIR, rel), 'utf8')
      );
      if (!meta.title) {
        console.error(`❌ docs-site/${rel} 缺少 front-matter title`);
        process.exit(1);
      }
      return {
        slug,
        title: meta.title,
        description: meta.description || '',
        group: meta.group || 'start',
        order: Number(meta.order || 99),
        body,
      };
    })
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

/* ---------- 外壳 ---------- */

function resolveMainCss() {
  try {
    const about = fs.readFileSync(path.join(DIST_DIR, 'about.html'), 'utf8');
    const m = about.match(/href="([^"]*assets\/main-[^"]+\.css)"/);
    if (m) return m[1].startsWith('/') ? m[1] : '/' + m[1];
  } catch {
    /* dist 未构建 */
  }
  console.warn(
    '⚠️  未能在 dist/about.html 中找到 main-*.css，文档页将缺少主站字体/主题变量'
  );
  return null;
}

function resolveHljsCss() {
  try {
    return fs.readFileSync(
      path.join(ROOT, 'node_modules/highlight.js/styles/github.css'),
      'utf8'
    );
  } catch {
    return '';
  }
}

const DOCS_CSS = `
.docs-body{margin:0;background:var(--color-canvas,#171a18);color:var(--color-text-primary,#f3f2ea);
  font-family:'DM Sans','Source Han Sans SC',system-ui,-apple-system,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;
  line-height:1.7;-webkit-font-smoothing:antialiased}
.docs-body a{color:var(--color-action,#4f9b78);text-decoration:none}
.docs-body a:hover{color:var(--color-action-hover,#69b58c);text-decoration:underline}
.docs-topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;
  gap:1rem;padding:.6rem 1.25rem;background:color-mix(in srgb,var(--color-surface,#202522) 88%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--color-border-subtle,#303833)}
.docs-brand{display:flex;align-items:center;gap:.6rem;font-weight:700;color:var(--color-text-primary,#f3f2ea)!important}
.docs-brand:hover{text-decoration:none}
.docs-brand img{height:34px;width:34px}
.theme-logo--dark{display:none}
[data-theme='light'] .theme-logo--light{display:none}
[data-theme='light'] .theme-logo--dark{display:block}
.docs-badge{font-size:.72rem;font-weight:600;padding:.1rem .45rem;border-radius:6px;
  background:var(--color-surface-raised,#2a302c);border:1px solid var(--color-border,#3b443d);
  color:var(--color-text-secondary,#b4bbb1)}
.docs-topbar-right{display:flex;align-items:center;gap:.9rem}
.docs-topbar-back{font-size:.9rem;color:var(--color-text-secondary,#b4bbb1)!important}
.docs-topbar-back:hover{color:var(--color-text-primary,#f3f2ea)!important}
.docs-theme-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;
  border-radius:8px;border:1px solid var(--color-border,#3b443d);cursor:pointer;
  background:var(--color-surface-raised,#2a302c);color:var(--color-text-primary,#f3f2ea)}
.docs-theme-btn svg{width:17px;height:17px}
.docs-menu-btn{display:none}
.docs-layout{display:grid;grid-template-columns:264px minmax(0,1fr);gap:2rem;
  max-width:1200px;margin:0 auto;padding:1.5rem 1.25rem 3rem}
.docs-sidebar{position:sticky;top:64px;align-self:start;max-height:calc(100vh - 84px);overflow-y:auto;
  padding-right:.5rem}
.docs-search{width:100%;box-sizing:border-box;padding:.45rem .7rem;border-radius:8px;font-size:.88rem;
  color:var(--color-text-primary,#f3f2ea);background:var(--color-surface-sunken,#121513);
  border:1px solid var(--color-border,#3b443d)}
.docs-search:focus{outline:2px solid var(--color-focus,#77b9c4);border-color:var(--color-focus,#77b9c4)}
.docs-search-results{margin:.5rem 0;border:1px solid var(--color-border,#3b443d);border-radius:8px;
  background:var(--color-surface,#202522);overflow:hidden}
.docs-search-results a{display:block;padding:.5rem .7rem;font-size:.85rem;border-bottom:1px solid var(--color-border-subtle,#303833);
  color:var(--color-text-primary,#f3f2ea)!important}
.docs-search-results a:last-child{border-bottom:none}
.docs-search-results a:hover{background:var(--color-surface-raised,#2a302c);text-decoration:none}
.docs-search-results .sr-where{display:block;font-size:.75rem;color:var(--color-text-tertiary,#7f8a80)}
.docs-search-empty{padding:.5rem .7rem;font-size:.83rem;color:var(--color-text-tertiary,#7f8a80)}
.docs-nav-group{margin-top:1.1rem}
.docs-nav-title{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--color-text-tertiary,#7f8a80);margin:.4rem 0 .35rem .55rem}
.docs-nav a{display:block;padding:.34rem .6rem;border-radius:7px;font-size:.88rem;
  color:var(--color-text-secondary,#b4bbb1)!important;border-left:2px solid transparent}
.docs-nav a:hover{background:var(--color-surface,#202522);color:var(--color-text-primary,#f3f2ea)!important;text-decoration:none}
.docs-nav a.active{color:var(--color-action,#4f9b78)!important;background:var(--color-surface,#202522);
  border-left-color:var(--color-action,#4f9b78);font-weight:600}
.docs-main{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem}
@media (min-width:1100px){.docs-main{grid-template-columns:minmax(0,1fr) 200px}}
.docs-article{min-width:0;padding:1.4rem 1.6rem;border:1px solid var(--color-border-subtle,#303833);
  border-radius:12px;background:var(--color-surface,#202522)}
.docs-article h1{font-size:1.75rem;line-height:1.3;margin:0 0 .4rem}
.docs-desc{color:var(--color-text-secondary,#b4bbb1);font-size:.95rem;margin:0 0 1.4rem}
.docs-content h2{font-size:1.3rem;margin:2rem 0 .7rem;padding-bottom:.35rem;
  border-bottom:1px solid var(--color-border-subtle,#303833);scroll-margin-top:76px}
.docs-content h3{font-size:1.05rem;margin:1.5rem 0 .5rem;scroll-margin-top:76px}
.docs-content p,.docs-content li{color:var(--color-text-secondary,#b4bbb1)}
.docs-content strong{color:var(--color-text-primary,#f3f2ea)}
.docs-content ul,.docs-content ol{padding-left:1.4rem}
.docs-content li{margin:.25rem 0}
.docs-content blockquote{margin:1rem 0;padding:.6rem 1rem;border-left:3px solid var(--color-action,#4f9b78);
  background:var(--color-surface-raised,#2a302c);border-radius:0 8px 8px 0;color:var(--color-text-secondary,#b4bbb1)}
.docs-content blockquote p{margin:.2rem 0}
.docs-content table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.9rem;display:block;overflow-x:auto}
.docs-content th,.docs-content td{border:1px solid var(--color-border,#3b443d);padding:.45rem .7rem;text-align:left}
.docs-content th{background:var(--color-surface-raised,#2a302c);color:var(--color-text-primary,#f3f2ea)}
.docs-content td{color:var(--color-text-secondary,#b4bbb1)}
.docs-content code{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:.86em;
  background:var(--color-surface-raised,#2a302c);border:1px solid var(--color-border-subtle,#303833);
  border-radius:5px;padding:.08rem .35rem}
.docs-content pre.hljs{background:#fff;border:1px solid var(--color-border,#3b443d);border-radius:10px;
  padding:.9rem 1.1rem;overflow-x:auto;margin:1rem 0}
.docs-content pre.hljs code{background:none;border:none;padding:0;font-size:.85rem;color:#24292e}
.docs-content hr{border:none;border-top:1px solid var(--color-border-subtle,#303833);margin:2rem 0}
.docs-content img{max-width:100%}
.docs-pager{display:flex;justify-content:space-between;gap:1rem;margin-top:2rem;
  padding-top:1.2rem;border-top:1px solid var(--color-border-subtle,#303833)}
.docs-pager a{display:flex;flex-direction:column;gap:.15rem;padding:.6rem .9rem;border-radius:9px;
  border:1px solid var(--color-border,#3b443d);max-width:48%}
.docs-pager a:hover{border-color:var(--color-action,#4f9b78);text-decoration:none}
.docs-pager .pg-label{font-size:.74rem;color:var(--color-text-tertiary,#7f8a80)}
.docs-pager .pg-title{font-size:.92rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.docs-pager .pg-next{margin-left:auto;text-align:right}
.docs-toc{position:sticky;top:64px;align-self:start;font-size:.84rem;display:none}
@media (min-width:1100px){.docs-toc{display:block}}
.docs-toc .toc-title{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--color-text-tertiary,#7f8a80);margin-bottom:.5rem}
.docs-toc a{display:block;padding:.22rem .5rem;color:var(--color-text-secondary,#b4bbb1)!important;
  border-left:2px solid var(--color-border-subtle,#303833)}
.docs-toc a:hover{color:var(--color-action,#4f9b78)!important;text-decoration:none}
.docs-toc a.lvl-3{padding-left:1.3rem;font-size:.8rem}
.docs-footer{border-top:1px solid var(--color-border-subtle,#303833);padding:1.6rem 1.25rem 2.2rem;
  text-align:center;font-size:.83rem;color:var(--color-text-tertiary,#7f8a80)}
.docs-footer a{color:var(--color-text-secondary,#b4bbb1)!important}
.docs-footer .foot-row{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;justify-content:center;align-items:center;margin-top:.4rem}
.docs-footer img{height:15px;width:15px;vertical-align:-2px;margin-right:3px}
@media (max-width:860px){
  .docs-layout{grid-template-columns:minmax(0,1fr);padding:1rem}
  .docs-sidebar{position:fixed;top:57px;left:0;bottom:0;z-index:30;width:280px;max-height:none;
    padding:1rem;background:var(--color-surface,#202522);border-right:1px solid var(--color-border,#3b443d);
    transform:translateX(-105%);transition:transform .2s ease}
  .docs-sidebar.open{transform:none}
  .docs-menu-btn{display:inline-flex}
  .docs-article{padding:1.1rem 1rem}
}

/* 跨文档视图过渡：文档之间切换时淡入淡出（需新旧页面都声明，故只影响 docs 内部导航；
   顶栏/侧栏各页一致，交叉淡化后视觉无缝，正文区域带轻微上浮） */
@view-transition{navigation:auto}
::view-transition-old(root){animation:docs-vt-out .16s ease-out both}
::view-transition-new(root){animation:docs-vt-in .22s ease-out both}
@keyframes docs-vt-out{from{opacity:1}to{opacity:0}}
@keyframes docs-vt-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
  ::view-transition-old(root),::view-transition-new(root){animation:none}
}
`;

const MOON_SVG =
  '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_SVG =
  '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
const MENU_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

const INLINE_JS = `
(function(){
  var KEY='tuhe.theme';
  var root=document.documentElement;
  var btn=document.getElementById('docs-theme-toggle');
  function syncIcon(){
    var dark=root.getAttribute('data-theme')!=='light';
    btn.querySelector('.i-moon').style.display=dark?'':'none';
    btn.querySelector('.i-sun').style.display=dark?'none':'';
  }
  if(btn){btn.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='light'?'dark':'light';
    root.setAttribute('data-theme',next);
    try{localStorage.setItem(KEY,next);}catch(e){}
    syncIcon();
  });syncIcon();}
  var menu=document.getElementById('docs-menu-btn');
  var sidebar=document.getElementById('docs-sidebar');
  if(menu&&sidebar){menu.addEventListener('click',function(){sidebar.classList.toggle('open');});}

  /* 客户端搜索：拉取 search-index.json，标题/小节/正文加权匹配 */
  var input=document.getElementById('docs-search');
  var box=document.getElementById('docs-search-results');
  var idx=null,timer=0;
  function loadIdx(){
    if(idx)return Promise.resolve(idx);
    return fetch('${u('docs/search-index.json')}').then(function(r){return r.json();})
      .then(function(d){idx=d.pages;return idx;})
      .catch(function(){idx=[];return idx;});
  }
  function snippet(text,q){
    var i=text.toLowerCase().indexOf(q);
    if(i<0)return '';
    var s=Math.max(0,i-30),e=Math.min(text.length,i+q.length+50);
    return (s>0?'…':'')+text.slice(s,e).trim()+(e<text.length?'…':'');
  }
  function render(results,q){
    box.textContent='';
    if(!q){box.hidden=true;return;}
    box.hidden=false;
    if(!results.length){
      var empty=document.createElement('div');
      empty.className='docs-search-empty';
      empty.textContent='未找到与「'+q+'」相关的内容';
      box.appendChild(empty);return;
    }
    results.slice(0,8).forEach(function(r){
      var a=document.createElement('a');
      a.href=r.href;
      var t=document.createElement('span');
      t.textContent=r.title;
      a.appendChild(t);
      if(r.where){
        var w=document.createElement('span');
        w.className='sr-where';
        w.textContent=r.where;
        a.appendChild(w);
      }
      box.appendChild(a);
    });
  }
  if(input&&box){
    input.addEventListener('input',function(){
      var q=input.value.trim().toLowerCase();
      clearTimeout(timer);
      timer=setTimeout(function(){
        if(!q){render([],'');return;}
        loadIdx().then(function(pages){
          var hits=[];
          pages.forEach(function(p){
            var best=null;
            if(p.title.toLowerCase().indexOf(q)>=0){
              best={href:p.path,title:p.title,where:'标题匹配'};
            }else{
              for(var i=0;i<p.headings.length;i++){
                if(p.headings[i].text.toLowerCase().indexOf(q)>=0){
                  best={href:p.path+'#'+p.headings[i].id,title:p.title,where:p.headings[i].text};
                  break;
                }
              }
              if(!best&&p.text.toLowerCase().indexOf(q)>=0){
                best={href:p.path,title:p.title,where:snippet(p.text,q)};
              }
            }
            if(best)hits.push(best);
          });
          render(hits,q);
        });
      },150);
    });
    document.addEventListener('click',function(e){
      if(!box.hidden&&!box.contains(e.target)&&e.target!==input){box.hidden=true;}
    });
  }
})();
`;

function renderSidebar(pages, currentSlug) {
  let html = '';
  for (const g of GROUPS) {
    const items = pages.filter((p) => p.group === g.id);
    if (!items.length) continue;
    html += `<div class="docs-nav-group"><div class="docs-nav-title">${g.title}</div>`;
    for (const p of items) {
      const href = p.slug === 'index' ? u('docs/') : u(`docs/${p.slug}`);
      const cls = p.slug === currentSlug ? ' class="active"' : '';
      html += `<a href="${href}"${cls}>${p.title}</a>`;
    }
    html += '</div>';
  }
  return html;
}

function renderToc(headings) {
  if (!headings.length) return '';
  let html =
    '<nav class="docs-toc" aria-label="本页目录"><div class="toc-title">本页目录</div>';
  for (const h of headings) {
    html += `<a class="lvl-${h.level}" href="#${h.id}">${h.text}</a>`;
  }
  return html + '</nav>';
}

function renderPager(pages, i) {
  const prev = pages[i - 1];
  const next = pages[i + 1];
  if (!prev && !next) return '';
  const hrefOf = (p) => (p.slug === 'index' ? u('docs/') : u(`docs/${p.slug}`));
  let html = '<div class="docs-pager">';
  html += prev
    ? `<a class="pg-prev" href="${hrefOf(prev)}"><span class="pg-label">← 上一篇</span><span class="pg-title">${prev.title}</span></a>`
    : '<span></span>';
  html += next
    ? `<a class="pg-next" href="${hrefOf(next)}"><span class="pg-label">下一篇 →</span><span class="pg-title">${next.title}</span></a>`
    : '';
  return html + '</div>';
}

function renderPage({
  page,
  pages,
  index,
  bodyHtml,
  headings,
  mainCss,
  hljsCss,
}) {
  const isIndex = page.slug === 'index';
  const canonical = isIndex
    ? `${SITE_URL}${BASE}docs/`
    : `${SITE_URL}${u(`docs/${page.slug}`)}`;
  const groupTitle =
    (GROUPS.find((g) => g.id === page.group) || {}).title || '';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '文档',
        item: `${SITE_URL}${BASE}docs/`,
      },
      ...(groupTitle && !isIndex
        ? [{ '@type': 'ListItem', position: 2, name: groupTitle }]
        : []),
      ...(!isIndex
        ? [
            {
              '@type': 'ListItem',
              position: groupTitle ? 3 : 2,
              name: page.title,
              item: canonical,
            },
          ]
        : []),
    ],
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title} - 图合PDF文档</title>
  <meta name="description" content="${page.description || `${page.title} — 图合PDF工具（TuHe PDF）使用文档`}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index,follow" />
  <link rel="icon" type="image/svg+xml" href="${u('images/favicon.svg')}" />
  <link rel="manifest" href="${u('site.webmanifest')}" />
  <!-- 主题引导：必须在 CSS 之前，防 FOUC（与主站 public/theme-init.js 一致） -->
  <script src="${u('theme-init.js')}"></script>
  ${mainCss ? `<link rel="stylesheet" href="${mainCss}" />` : ''}
  <style>${hljsCss}</style>
  <style>${DOCS_CSS}</style>
</head>
<body class="docs-body">
  <header class="docs-topbar">
    <div style="display:flex;align-items:center;gap:.7rem">
      <button id="docs-menu-btn" class="docs-theme-btn docs-menu-btn" type="button" aria-label="打开目录">${MENU_SVG}</button>
      <a class="docs-brand" href="${u('')}">
        <img src="${u('images/light.png')}" alt="TuHe PDF Logo" class="theme-logo theme-logo--light" />
        <img src="${u('images/dark.png')}" alt="TuHe PDF Logo" class="theme-logo theme-logo--dark" />
        <span>TuHe PDF</span>
        <span class="docs-badge">文档</span>
      </a>
    </div>
    <div class="docs-topbar-right">
      <a class="docs-topbar-back" href="${u('')}">← 返回工具</a>
      <button id="docs-theme-toggle" class="docs-theme-btn" type="button" aria-label="切换主题">${MOON_SVG}${SUN_SVG}</button>
    </div>
  </header>

  <div class="docs-layout">
    <aside class="docs-sidebar" id="docs-sidebar" aria-label="文档目录">
      <input id="docs-search" class="docs-search" type="search" placeholder="搜索文档…" autocomplete="off" />
      <div id="docs-search-results" class="docs-search-results" hidden></div>
      <nav class="docs-nav">${renderSidebar(pages, page.slug)}</nav>
    </aside>

    <div class="docs-main">
      <article class="docs-article">
        <h1>${page.title}</h1>
        ${page.description ? `<p class="docs-desc">${page.description}</p>` : ''}
        <div class="docs-content">${bodyHtml}</div>
        ${renderPager(pages, index)}
      </article>
      ${renderToc(headings)}
    </div>
  </div>

  <footer class="docs-footer">
    <div>图合PDF工具（TuHe PDF）· 文档 · &copy; 2026 TuHe PDF</div>
    <div class="foot-row">
      <a href="${u('about')}">关于</a>
      <a href="${u('contact')}">联系与投诉</a>
      <a href="${u('privacy')}">隐私政策</a>
      <a href="${u('terms')}">服务条款</a>
      <a href="${u('licensing')}">开源许可</a>
    </div>
    <div class="foot-row">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">苏ICP备2026010377号</a>
      <span>
        <img src="${u('images/备案图标.png')}" alt="公安备案图标" />
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=32132202001544" target="_blank" rel="noopener noreferrer">苏公网安备32132202001544号</a>
      </span>
      <a href="https://github.com/alam00000/tuhe-pdf" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </footer>

  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script>${INLINE_JS}</script>
</body>
</html>
`;
}

/* ---------- main ---------- */

function main() {
  console.log('📚 Generating docs site…');
  const pages = loadPages();
  if (!pages.length) {
    console.error('❌ docs-site/ 下没有任何 .md 文件');
    process.exit(1);
  }
  const mainCss = resolveMainCss();
  const hljsCss = resolveHljsCss();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const searchIndex = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { html, headings } = renderMarkdown(page.body);
    const outPath = path.join(OUT_DIR, `${page.slug}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      renderPage({
        page,
        pages,
        index: i,
        bodyHtml: html,
        headings,
        mainCss,
        hljsCss,
      })
    );

    const cleanUrl =
      page.slug === 'index' ? u('docs/') : u(`docs/${page.slug}`);
    searchIndex.push({
      path: cleanUrl,
      title: page.title,
      headings,
      text: html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000),
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'search-index.json'),
    JSON.stringify({ pages: searchIndex })
  );

  console.log(
    `✅ Docs: ${pages.length} pages → dist/docs/ (+ search-index.json)`
  );
}

main();
