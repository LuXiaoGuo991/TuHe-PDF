# TuHe PDF WASM Proxy 部署指南

TuHe PDF 使用 Cloudflare Worker 代理 WASM 模块请求，绕过从外部源加载 AGPL 许可组件（PyMuPDF、Ghostscript、CoherentPDF）时的 CORS 限制。

## 快速开始

### 1. 部署 Worker

```bash
cd cloudflare
npx wrangler login
npx wrangler deploy -c wasm-wrangler.toml
```

### 2. 配置源 URL

为 WASM 文件的基础 URL 设置环境密钥：

```bash
# 方式 A: 交互式提示
npx wrangler secret put PYMUPDF_SOURCE -c wasm-wrangler.toml
npx wrangler secret put GS_SOURCE -c wasm-wrangler.toml
npx wrangler secret put CPDF_SOURCE -c wasm-wrangler.toml

# 方式 B: 通过 Cloudflare Dashboard 设置
# Workers & Pages > tuhe-pdf-wasm-proxy > Settings > Variables
```

**推荐源 URL：**

- PYMUPDF_SOURCE: `https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.16/`
- GS_SOURCE: `https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm/assets/`
- CPDF_SOURCE: `https://cdn.jsdelivr.net/npm/coherentpdf/dist/`

### 3. 配置 TuHe PDF

**方式 A: 环境变量（推荐，用户零配置）**

在 `.env.production` 中设置或通过 Docker 构建参数传入：

```bash
VITE_WASM_PYMUPDF_URL=https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/pymupdf/
VITE_WASM_GS_URL=https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/gs/
VITE_WASM_CPDF_URL=https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/cpdf/
```

**方式 B: 用户手动配置**

在 TuHe PDF 的高级设置页面（wasm-settings.html）中输入：

| 模块        | URL                                                             |
| ----------- | --------------------------------------------------------------- |
| PyMuPDF     | `https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/pymupdf/` |
| Ghostscript | `https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/gs/`      |
| CoherentPDF | `https://tuhe-pdf-wasm-proxy.<你的子域名>.workers.dev/cpdf/`    |

## 自定义域名（可选）

使用 `wasm.tuhepdf.cn` 等自定义域名：

1. 在 `wasm-wrangler.toml` 中添加路由：

```toml
routes = [
  { pattern = "wasm.tuhepdf.cn/*", zone_name = "tuhepdf.cn" }
]
```

2. 在 Cloudflare 中添加 DNS 记录：
   - 类型: AAAA
   - 名称: wasm
   - 内容: 100::
   - 代理: 是

3. 重新部署：

```bash
npx wrangler deploy -c wasm-wrangler.toml
```

## 安全特性

- **来源验证**：仅允许来自已配置来源的请求
- **速率限制**：每 IP 100 次请求/分钟（需要 KV 命名空间）
- **文件类型限制**：仅允许 WASM 相关文件（.js、.wasm、.data 等）
- **大小限制**：每个文件最大 100MB
- **缓存**：减少回源请求，提升性能

## 自托管说明

1. 更新 `wasm-proxy-worker.js` 中的 `ALLOWED_ORIGINS`，加入你的域名
2. 将 WASM 文件托管到任意源（R2、S3 或任意 CDN）
3. 在 Worker 中将源 URL 设置为密钥

## 端点

| 端点         | 描述                     |
| ------------ | ------------------------ |
| `/`          | 健康检查，显示已配置模块 |
| `/pymupdf/*` | PyMuPDF WASM 文件        |
| `/gs/*`      | Ghostscript WASM 文件    |
| `/cpdf/*`    | CoherentPDF 文件         |
