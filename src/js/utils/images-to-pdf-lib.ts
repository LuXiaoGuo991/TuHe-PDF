import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { preprocessImageFile, getFileExtension } from './image-input-utils.js';
import { compressImageFile, type ImageQuality } from './image-compress.js';

export interface EmbeddableImage {
  bytes: Uint8Array;
  format: 'jpg' | 'png';
}

/**
 * 浏览器 canvas 可稳定解码、且无需引擎预处理的格式 → 走 pdf-lib 快路径（不加载 WASM 引擎）。
 * 其余格式（TIFF/SVG/AVIF/JPEG2000/JXR/PSD/PNM 系列等）需要 PyMuPDF 引擎兜底，
 * 以保证跨浏览器兼容性与转换质量不回归。
 */
const CANVAS_SAFE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.heic',
  '.heif',
]);

export function isCanvasSafeImage(file: File): boolean {
  return CANVAS_SAFE_EXTENSIONS.has(getFileExtension(file.name));
}

export async function normalizeImageToEmbeddable(
  file: File
): Promise<EmbeddableImage> {
  const processed = await preprocessImageFile(file);
  const name = processed.name.toLowerCase();
  const isJpg =
    processed.type === 'image/jpeg' ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg');
  const isPng = processed.type === 'image/png' || name.endsWith('.png');

  if (isJpg) {
    return {
      bytes: new Uint8Array(await processed.arrayBuffer()),
      format: 'jpg',
    };
  }
  if (isPng) {
    return {
      bytes: new Uint8Array(await processed.arrayBuffer()),
      format: 'png',
    };
  }

  const url = URL.createObjectURL(processed);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(new Error(`Failed to decode image: ${processed.name}`));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/png'
      );
    });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: 'png' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertImagesToPdfFile(
  images: File[],
  quality?: ImageQuality
): Promise<File> {
  const pdfDoc = await PDFLibDocument.create();
  for (const img of images) {
    const processed = await preprocessImageFile(img);
    // medium/low 时先压缩（canvas 缩放/重编码为 JPEG），high 或不传则原样嵌入，与引擎路径行为一致
    const toEmbed =
      quality && quality !== 'high'
        ? await compressImageFile(processed, quality)
        : processed;
    const { bytes, format } = await normalizeImageToEmbeddable(toEmbed);
    const embedded =
      format === 'jpg'
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);
    const page = pdfDoc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }
  const pdfBytes = await pdfDoc.save();
  const filename =
    images.length === 1
      ? images[0].name.replace(/\.[^.]+$/, '.pdf')
      : `images-${Date.now()}.pdf`;
  return new File([new Uint8Array(pdfBytes)], filename, {
    type: 'application/pdf',
  });
}
