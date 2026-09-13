/* TuHe PDF —— <head> 首屏守卫（防循环嵌套）
 *
 * 用法：在 <head> 中用**经典脚本**同步引用，不加 type="module"，也不要加
 * defer / async —— 必须阻塞解析，才能在 <body> 解析与首帧绘制之前执行：
 *   <script src="/head-guards.js"></script>
 *
 * 为什么不写成内联 <script>：站点页 CSP 为
 *   script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob:
 * 不含 'unsafe-inline'，也未配置 hash / nonce —— 内联脚本会被浏览器静默拦截，
 * 而且**只在生产环境失效**（vite dev / preview 都不下发 CSP），
 * 因此这类守卫必须走 'self' 外部文件。
 *
 * 注意：nginx 对 .js 设了 expires 1y，修改本文件内容后需改文件名或清缓存，
 * 否则老用户可能长期命中旧副本。
 */
(function () {
  // 工作台只能在顶层窗口运行。若被误当作普通页面塞进 iframe（例如某静态页
  // 缺失、dev 服务器回退到本页），立即跳出，避免工作台无限自我嵌套。
  if (window.self === window.top) {
    return;
  }

  try {
    window.top.location.replace(window.location.href);
  } catch (err) {
    // 跨源场景下读写 window.top.location 会抛异常，退到空白页
    window.location.replace('about:blank');
  }
})();
