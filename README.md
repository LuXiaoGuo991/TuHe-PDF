<p align="center"><img src="public/images/favicon-no-bg.svg" width="80"></p>
<h1 align="center">TuHe PDF · 图合</h1>
<p align="center"><strong>纯浏览器端 PDF 工作台 — 文件不出本机，免注册，无限制</strong></p>

---

## 简介

**TuHe PDF（图合）** 是一个以隐私为先的客户端 PDF 工具箱，可在浏览器中直接完成合并、拆分、压缩、格式转换、页面整理、签名与水印等操作。所有处理完全在本地浏览器中进行，无需服务器端处理，确保文件安全私密。

基于 [BentoPDF](https://github.com/alam00000/bentopdf) 二次开发，遵循 GNU AGPL-3.0 许可证开源。

## 特性

- 🔒 **纯浏览器端处理** — 文件全程不离开你的设备
- 🆓 **完全免费** — 无试用期、无付费墙、无隐藏限制
- 📦 **无需注册** — 即开即用，无需账户或邮箱
- 📱 **全平台支持** — 任何现代浏览器均可使用，包括手机
- 🚀 **极速处理** — 基于 WebAssembly，性能媲美桌面软件
- 🌐 **离线可用** — 加载后可离线使用

## 快速开始

```bash
# 开发环境
npm ci
npm run dev

# 生产构建
npm run build
npm run preview
```

### Docker 部署

```bash
docker run -p 3000:8080 ghcr.io/alam00000/bentopdf-simple:latest
```

## 技术栈

HTML · CSS · TypeScript · Vite · Tailwind CSS · PDF.js · PDF-lib · WebAssembly

## 上游致谢

TuHe PDF 基于 [BentoPDF](https://github.com/alam00000/bentopdf)（AGPL-3.0）二次开发。感谢上游作者 [Alam](https://github.com/alam00000) 及所有贡献者的工作。

## 许可

TuHe PDF 依据 [GNU AGPL-3.0](LICENSE) 许可证发布。详见 [许可页面](licensing.html)。
