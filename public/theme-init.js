/* TuHe PDF —— 首屏主题引导（防主题闪烁 / FOUC）
 *
 * 用法：放在 public/ 下，在 <head> 中用**经典脚本**（不加 type="module"）同步引用：
 *   <script src="/theme-init.js"></script>
 * 经典脚本会阻塞 HTML 解析，因此它在 <body> 解析与首帧绘制之前执行，
 * 让 <html data-theme> 在第一次绘制时就已是正确的主题。
 *
 * 为什么不写成内联 <script>：站点页 CSP 为
 *   script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob:
 * 不含 'unsafe-inline'、也未配置 hash/nonce，内联脚本会被浏览器静默拦截，
 * 且只在生产环境失效（dev 服务器不下发 CSP）——因此必须走 'self' 外部文件。
 *
 * 取值口径必须与 src/js/utils/theme.ts 保持一致：
 *   键名 'tuhe.theme'；仅接受 'dark' | 'light'；缺失、非法或 localStorage
 *   不可用时回退 'dark'。本文件只做「首次落地」，不做事件绑定与持久化。
 *
 * 注意：nginx 对 .js 设了 expires 1y，修改本文件内容后需要改文件名或清缓存，
 * 否则老用户可能长期命中旧副本。
 */
(function () {
  var KEY = 'tuhe.theme';
  var theme = 'dark';

  try {
    var saved = window.localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') {
      theme = saved;
    }
  } catch (err) {
    /* localStorage 被禁用时使用默认值 */
  }

  document.documentElement.setAttribute('data-theme', theme);
})();
