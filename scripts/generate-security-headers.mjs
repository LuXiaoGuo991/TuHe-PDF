#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// 站点面 CSP 刻意不含 'unsafe-inline'：**站点页 *.html 中不得出现可执行的内联 <script>**。
// 内联脚本会在生产环境被浏览器静默拦截，而 vite dev / preview 都不下发 CSP，
// 本地完全看不出问题（历史上「防循环嵌套」与「首屏主题引导」都踩过这个坑）。
// 需要首屏同步执行的脚本一律放到 public/ 下用 <script src="/xxx.js"> 引用：
//   public/theme-init.js   首屏主题引导，防主题闪烁
//   public/head-guards.js  防循环嵌套等安全守卫
// <script type="application/ld+json"> 属数据块，不受 script-src 约束，可内联。
const directives = [
  `default-src 'self'`,
  `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob:`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-src 'self' blob:`,
  `frame-ancestors 'self'`,
  `form-action 'self'`,
];

const docsDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'self'`,
  `form-action 'self'`,
];

const csp = directives.join('; ');
const docsCsp = docsDirectives.join('; ');

const hstsMaxAge = 31536000;

const commonHeaders = `add_header Strict-Transport-Security "max-age=${hstsMaxAge}; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "credentialless" always;
add_header Cross-Origin-Resource-Policy "cross-origin" always;
`;

const contents = `add_header Content-Security-Policy "${csp}" always;
${commonHeaders}`;

const docsContents = `add_header Content-Security-Policy "${docsCsp}" always;
${commonHeaders}`;

const outPath = join(repoRoot, 'security-headers.conf');
const docsOutPath = join(repoRoot, 'security-headers-docs.conf');
writeFileSync(outPath, contents);
writeFileSync(docsOutPath, docsContents);
console.log(`[security-headers] wrote ${outPath} with same-origin directives`);
console.log(`[security-headers] wrote ${docsOutPath} (docs CSP)`);
