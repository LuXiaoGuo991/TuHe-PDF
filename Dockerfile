# Global variable declaration:
# Build to serve under Subdirectory BASE_URL if provided, eg: "ARG BASE_URL=/pdf/", otherwise leave blank: "ARG BASE_URL="
ARG BASE_URL=

# Build stage
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY vendor ./vendor
ENV HUSKY=0
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm config set fetch-timeout 600000 && \
    npm ci
COPY . .

# Build without type checking (vite build only)
# Pass SIMPLE_MODE environment variable if provided
ARG SIMPLE_MODE=false
ENV SIMPLE_MODE=$SIMPLE_MODE
ARG COMPRESSION_MODE=all
ENV COMPRESSION_MODE=$COMPRESSION_MODE

# global arg to local arg - BASE_URL is read from env by vite.config.ts
ARG BASE_URL
ENV BASE_URL=$BASE_URL

# OCR language list for the locally bundled OCR data
ARG VITE_TESSERACT_AVAILABLE_LANGUAGES
ENV VITE_TESSERACT_AVAILABLE_LANGUAGES=$VITE_TESSERACT_AVAILABLE_LANGUAGES

# Default UI language (e.g. en, fr, de, es, zh, ar)
ARG VITE_DEFAULT_LANGUAGE
ENV VITE_DEFAULT_LANGUAGE=$VITE_DEFAULT_LANGUAGE

# Custom branding (e.g. VITE_BRAND_NAME=MyCompany VITE_BRAND_LOGO=my-logo.svg)
ARG VITE_BRAND_NAME
ARG VITE_BRAND_LOGO
ARG VITE_FOOTER_TEXT
ENV VITE_BRAND_NAME=$VITE_BRAND_NAME
ENV VITE_BRAND_LOGO=$VITE_BRAND_LOGO
ENV VITE_FOOTER_TEXT=$VITE_FOOTER_TEXT

ARG DISABLE_TOOLS
ENV DISABLE_TOOLS=$DISABLE_TOOLS

# Public-facing canonical site URL. Defaults to the official site so self-hosters
# consolidate SEO signals back to www.tuhepdf.cn. Override with --build-arg
# SITE_URL=https://your-domain.example to claim canonical for your own deployment.
ARG SITE_URL=https://www.tuhepdf.cn
ENV SITE_URL=$SITE_URL

ENV NODE_OPTIONS="--max-old-space-size=3072"

RUN npm run build

# Production stage
FROM quay.io/nginx/nginx-unprivileged:alpine-slim

# global arg to local arg
ARG BASE_URL

# Set this to "true" to disable Nginx listening on IPv6
ENV DISABLE_IPV6=false
ENV PORT=8080

USER root
RUN apk upgrade --no-cache

COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html${BASE_URL%/}
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx --from=builder /app/security-headers.conf /etc/nginx/security-headers.conf
COPY --chown=nginx:nginx --from=builder /app/security-headers-docs.conf /etc/nginx/security-headers-docs.conf
COPY --chown=nginx:nginx --chmod=755 nginx-ipv6.sh /docker-entrypoint.d/99-disable-ipv6.sh
COPY --chown=nginx:nginx --chmod=755 nginx-noindex.sh /docker-entrypoint.d/98-noindex.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/98-noindex.sh /docker-entrypoint.d/99-disable-ipv6.sh \
    && mkdir -p /etc/nginx/tmp \
    && chown -R nginx:nginx /etc/nginx/tmp

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
