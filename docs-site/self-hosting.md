---
title: 自部署
description: 使用 Docker 在自己的服务器上部署图合PDF工具：构建参数、镜像加速、反向代理与升级说明。
group: start
order: 4
---

## 概述

图合PDF是**纯静态站点**：所有处理逻辑都在浏览器端通过 WebAssembly 完成，服务端只需要一个静态文件服务器。官方镜像使用 nginx 提供服务（默认监听 8080 端口），没有数据库、没有后端进程、没有需要保密的密钥。

项目以 AGPL-3.0 协议开源，仓库地址：[github.com/alam00000/tuhe-pdf](https://github.com/alam00000/tuhe-pdf)。

## 用 Docker Compose 快速启动

```bash
git clone https://github.com/alam00000/tuhe-pdf.git
cd tuhe-pdf
docker compose up -d --build
```

启动后访问 `http://<服务器IP>:8080`。仓库自带的 `compose.yml` 已包含品牌与站点 URL 参数示例。

## 构建参数

`Dockerfile` 支持以下常用构建参数（`docker build --build-arg` 或 compose 的 `build.args`）：

| 参数                                                       | 说明                                             | 默认值               |
| ---------------------------------------------------------- | ------------------------------------------------ | -------------------- |
| `SITE_URL`                                                 | 站点规范 URL，用于 canonical/sitemap 等 SEO 信号 | `https://tuhepdf.cn` |
| `BASE_URL`                                                 | 部署到子目录时使用，如 `/pdf/`                   | 空（根路径）         |
| `VITE_DEFAULT_LANGUAGE`                                    | 默认界面语言，如 `zh`、`en`                      | 由构建配置决定       |
| `VITE_BRAND_NAME` / `VITE_BRAND_LOGO` / `VITE_FOOTER_TEXT` | 自定义品牌名、Logo、页脚文字                     | TuHe PDF             |
| `SIMPLE_MODE`                                              | 精简模式构建                                     | `false`              |
| `DISABLE_TOOLS`                                            | 禁用指定工具                                     | 空                   |
| `VITE_TESSERACT_AVAILABLE_LANGUAGES`                       | 随包携带的 OCR 语言数据列表                      | 由构建配置决定       |

自建部署建议将 `SITE_URL` 改为你自己的域名，避免 SEO 规范链接指回官方站。

## 受限网络构建（国内镜像加速）

拉取基础镜像或 npm 依赖困难时，可覆盖以下参数：

```bash
docker build \
  --build-arg NODE_IMAGE=docker.xuanyuan.run/library/node:20-alpine \
  --build-arg NGINX_IMAGE=docker.xuanyuan.run/nginxinc/nginx-unprivileged:alpine-slim \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  -t tuhe-pdf .
```

## 反向代理与 HTTPS

生产环境建议在前面加一层反向代理（Caddy、nginx 等）终止 TLS。要点：

- 上游是容器的 **8080** 端口
- 站点需要 HTTPS 才能使用全部浏览器能力（WebAssembly、剪贴板、Service Worker 缓存等在安全上下文下表现最佳）
- 容器内 nginx 已下发 CSP 等安全响应头（`security-headers.conf` / `security-headers-docs.conf`），反代请勿重复追加同名头
- 不需要 IPv6 时设置容器环境变量 `DISABLE_IPV6=true`

`deploy/` 目录内含生产环境的 compose 参考配置（nginx + Caddy 反代）。

## 升级

静态站点升级即重建镜像：

```bash
git pull
docker compose up -d --build
```

用户浏览器中的 Service Worker 缓存与 OCR 语言数据不受影响；版本更新后刷新页面即可拿到新资源。

## 部署合规提示（中国大陆服务器）

- 域名解析到境内服务器需完成 **ICP 备案**；页脚的备案号请通过 `VITE_FOOTER_TEXT` 或自行修改模板替换为你的备案信息
- 若保留公安备案图标与链接，请替换为你自己的备案编号
