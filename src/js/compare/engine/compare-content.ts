import type {
  CompareAnnotation,
  CompareContentCategory,
  CompareImageRef,
  ComparePageModel,
  CompareRectangle,
  CompareTextChange,
} from '../types.ts';
import { t } from '../../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};

const HEADER_FOOTER_ZONE = 0.12;

export function classifyChangeCategory(
  change: CompareTextChange,
  pageHeight: number
): CompareContentCategory {
  if (change.type === 'style-changed') return 'formatting';

  const rects =
    change.beforeRects.length > 0 ? change.beforeRects : change.afterRects;
  if (rects.length > 0 && isHeaderFooterZone(rects, pageHeight)) {
    return 'header-footer';
  }

  return 'text';
}

function isHeaderFooterZone(
  rects: CompareRectangle[],
  pageHeight: number
): boolean {
  const headerThreshold = pageHeight * HEADER_FOOTER_ZONE;
  const footerThreshold = pageHeight * (1 - HEADER_FOOTER_ZONE);
  return rects.every(
    (r) => r.y < headerThreshold || r.y + r.height > footerThreshold
  );
}

export function diffAnnotations(
  before: CompareAnnotation[],
  after: CompareAnnotation[],
  baseId: number
): CompareTextChange[] {
  const changes: CompareTextChange[] = [];
  const beforeMap = new Map(
    before
      .filter(shouldCompareAnnotation)
      .map((annotation) => [annotationKey(annotation), annotation])
  );
  const afterMap = new Map(
    after
      .filter(shouldCompareAnnotation)
      .map((annotation) => [annotationKey(annotation), annotation])
  );

  let idx = baseId;
  for (const [key, ann] of beforeMap) {
    if (!afterMap.has(key)) {
      changes.push({
        id: `annotation-removed-${idx++}`,
        type: 'removed',
        category: 'annotation',
        description: formatAnnotationDescription('removed', ann),
        beforeText: ann.contents || ann.title || '',
        afterText: '',
        beforeRects: [ann.rect],
        afterRects: [],
      });
    }
  }

  for (const [key, ann] of afterMap) {
    if (!beforeMap.has(key)) {
      changes.push({
        id: `annotation-added-${idx++}`,
        type: 'added',
        category: 'annotation',
        description: formatAnnotationDescription('added', ann),
        beforeText: '',
        afterText: ann.contents || ann.title || '',
        beforeRects: [],
        afterRects: [ann.rect],
      });
    }
  }

  return changes;
}

function shouldCompareAnnotation(annotation: CompareAnnotation): boolean {
  if (annotation.subtype !== 'Highlight') {
    return true;
  }

  return Boolean(annotation.contents || annotation.title);
}

function formatAnnotationDescription(
  action: 'added' | 'removed',
  annotation: CompareAnnotation
): string {
  const label = annotation.contents || annotation.title;
  const actionText =
    action === 'added'
      ? translate('tools:comparePdfs.changeAdded', 'Added')
      : translate('tools:comparePdfs.changeDeleted', 'Deleted');
  if (!label) {
    return translate(
      'tools:comparePdfs.annotationAction',
      `${actionText} ${annotation.subtype} annotation`,
      { action: actionText, subtype: annotation.subtype }
    );
  }

  return translate(
    'tools:comparePdfs.annotationActionWithLabel',
    `${actionText} ${annotation.subtype} annotation: "${label}"`,
    { action: actionText, subtype: annotation.subtype, label }
  );
}

function annotationKey(ann: CompareAnnotation): string {
  return `${ann.subtype}|${ann.contents}|${Math.round(ann.rect.x)},${Math.round(ann.rect.y)}`;
}

export function diffImages(
  before: CompareImageRef[],
  after: CompareImageRef[],
  baseId: number
): CompareTextChange[] {
  const changes: CompareTextChange[] = [];
  const matched = new Set<string>();
  let idx = baseId;

  for (const bImg of before) {
    const match = after.find(
      (aImg) => !matched.has(aImg.id) && imagesOverlap(bImg.rect, aImg.rect)
    );
    if (match) {
      matched.add(match.id);
      if (bImg.width !== match.width || bImg.height !== match.height) {
        changes.push({
          id: `image-modified-${idx++}`,
          type: 'modified',
          category: 'image',
          description: translate(
            'tools:comparePdfs.imageResized',
            `Image resized from ${bImg.width}×${bImg.height} to ${match.width}×${match.height}`,
            {
              beforeWidth: bImg.width,
              beforeHeight: bImg.height,
              afterWidth: match.width,
              afterHeight: match.height,
            }
          ),
          beforeText: `${bImg.width}×${bImg.height}`,
          afterText: `${match.width}×${match.height}`,
          beforeRects: [bImg.rect],
          afterRects: [match.rect],
        });
      }
    } else {
      changes.push({
        id: `image-removed-${idx++}`,
        type: 'removed',
        category: 'image',
        description: translate(
          'tools:comparePdfs.imageRemoved',
          `Removed image (${bImg.width}×${bImg.height})`,
          { width: bImg.width, height: bImg.height }
        ),
        beforeText: '',
        afterText: '',
        beforeRects: [bImg.rect],
        afterRects: [],
      });
    }
  }

  for (const aImg of after) {
    if (!matched.has(aImg.id)) {
      changes.push({
        id: `image-added-${idx++}`,
        type: 'added',
        category: 'image',
        description: translate(
          'tools:comparePdfs.imageAdded',
          `Added image (${aImg.width}×${aImg.height})`,
          { width: aImg.width, height: aImg.height }
        ),
        beforeText: '',
        afterText: '',
        beforeRects: [],
        afterRects: [aImg.rect],
      });
    }
  }

  return changes;
}

function imagesOverlap(a: CompareRectangle, b: CompareRectangle): boolean {
  const overlapX = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const overlapY = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  const overlapArea = overlapX * overlapY;
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  const smallerArea = Math.min(aArea, bArea);
  return smallerArea > 0 && overlapArea / smallerArea > 0.3;
}

export function detectBackgroundChanges(
  leftModel: ComparePageModel,
  rightModel: ComparePageModel,
  visualMismatchRatio: number,
  textChangeRects: CompareRectangle[],
  baseId: number
): CompareTextChange[] {
  if (visualMismatchRatio < 0.01) return [];

  const textCoverage = textChangeRects.reduce(
    (sum, r) => sum + r.width * r.height,
    0
  );
  const pageArea = leftModel.width * leftModel.height;
  const textRatio = pageArea > 0 ? textCoverage / pageArea : 0;

  if (visualMismatchRatio > textRatio + 0.05) {
    return [
      {
        id: `background-changed-${baseId}`,
        type: 'modified',
        category: 'background',
        description: translate(
          'tools:comparePdfs.backgroundChanged',
          'Page background or layout changed'
        ),
        beforeText: '',
        afterText: '',
        beforeRects: [
          { x: 0, y: 0, width: leftModel.width, height: leftModel.height },
        ],
        afterRects: [
          { x: 0, y: 0, width: rightModel.width, height: rightModel.height },
        ],
      },
    ];
  }

  return [];
}

export function buildCategorySummary(changes: CompareTextChange[]) {
  const summary = {
    text: 0,
    image: 0,
    'header-footer': 0,
    annotation: 0,
    formatting: 0,
    background: 0,
  };
  for (const c of changes) {
    summary[c.category] += 1;
  }
  return summary;
}
