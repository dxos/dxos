//
// Copyright 2026 DXOS.org
//

//
// Excalidraw backend for the scene DSL: compiles a `WorldObject` into excalidraw elements.
// Element identity is stamped into each element's `customData` (`{ object, element, kind, scale }`)
// so `read.ts` can reconstruct the scene and edits can address elements by id. Box/arrow labels
// are separate text elements marked with `part: 'label'` and folded back on read.
//

import { type Scene } from '@dxos/plugin-illustrator/model';

import { toFontSize, toStyle } from './style';

/** Canvas content: an opaque map of ElementId → excalidraw element. */
export type CanvasContent = Record<string, any>;

/** Canvas-px bounding box of an existing element another object's arrow may bind to. */
export type ExternalBox = { x: number; y: number; w: number; h: number };

export type RenderOptions = {
  origin: Scene.Point;
  scale: number;
  /** Fractional-index seed past the existing canvas content. */
  indexStart: number;
  /** Bounding boxes of existing elements, keyed by `objectId/elementId` (canvas px). */
  external?: Record<string, ExternalBox>;
  dialect?: string;
};

/** Stable element id: `<objectId>/<elementId>`. */
export const elementId = (objectId: string, elementRef: string) => `${objectId}/${elementRef}`;

const LINE_HEIGHT = 1.25;
/** Rough advance width per character relative to font size (excalidraw measures precisely on load). */
const CHAR_WIDTH = 0.6;

/** Deterministic 32-bit hash for seeds/nonces so renders are reproducible. */
const hash = (value: string): number => {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (Math.imul(result, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(result) + 1;
};

type BaseOptions = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
  meta: Record<string, any>;
};

const base = ({ id, type, x, y, w, h, index, meta }: BaseOptions) => ({
  id,
  type,
  x,
  y,
  width: w,
  height: h,
  angle: 0,
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  index: `a${index}`,
  roundness: null,
  seed: hash(id),
  version: 1,
  versionNonce: hash(`${id}#nonce`),
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
  customData: meta,
});

const text = (options: BaseOptions & { text: string; fontSize: number }) => ({
  ...base(options),
  text: options.text,
  fontSize: options.fontSize,
  fontFamily: 1,
  textAlign: 'left',
  verticalAlign: 'top',
  containerId: null,
  originalText: options.text,
  autoResize: true,
  lineHeight: LINE_HEIGHT,
});

const linear = (options: BaseOptions & { points: [number, number][]; roundness?: boolean }) => ({
  ...base(options),
  points: options.points,
  lastCommittedPoint: null,
  startBinding: null,
  endBinding: null,
  startArrowhead: null,
  endArrowhead: options.type === 'arrow' ? 'arrow' : null,
  roundness: options.roundness ? { type: 2 } : null,
});

/** Estimated size of a text label (excalidraw re-measures on load). */
const textSize = (value: string, fontSize: number): { w: number; h: number } => {
  const lines = value.split('\n');
  return {
    w: Math.max(...lines.map((line) => line.length)) * fontSize * CHAR_WIDTH,
    h: lines.length * fontSize * LINE_HEIGHT,
  };
};

/**
 * Compile one world object into excalidraw elements (canvas-px coordinates).
 * Local coordinates are mapped via `canvas = origin + local * scale`.
 */
export const renderObject = (
  object: Scene.WorldObject | { id: string; elements: readonly Scene.Element[] },
  options: RenderOptions,
): CanvasContent => {
  const { origin, scale, indexStart, external = {}, dialect = 'scene' } = options;
  const point = (local: { x: number; y: number }): Scene.Point => ({
    x: origin.x + local.x * scale,
    y: origin.y + local.y * scale,
  });
  const length = (units: number) => units * scale;

  const content: CanvasContent = {};
  let index = indexStart;
  const meta = (element: Scene.Element, kind: string, extra: Record<string, any> = {}) => ({
    object: object.id,
    element: element.id,
    kind,
    scale,
    dialect,
    ...extra,
  });

  // Refs are element ids within this object, or `objectId/elementId` across objects.
  const ref = (value: string) => (value.includes('/') ? value : `${object.id}/${value}`);
  // Bounding boxes of elements rendered so far plus pre-existing canvas elements.
  const box = (handle: string): ExternalBox | undefined => {
    const record = content[handle];
    if (record) {
      return { x: record.x, y: record.y, w: record.width, h: record.height };
    }
    return external[handle];
  };

  /** Centered label as a companion text element, folded back into `text` on read. */
  const label = (element: Scene.Element, value: string, bounds: ExternalBox) => {
    const id = `${elementId(object.id, element.id)}__label`;
    const fontSize = toFontSize(element.weight);
    const size = textSize(value, fontSize);
    content[id] = {
      ...text({
        id,
        type: 'text',
        x: bounds.x + (bounds.w - size.w) / 2,
        y: bounds.y + (bounds.h - size.h) / 2,
        w: size.w,
        h: size.h,
        index: index++,
        meta: meta(element, 'text', { part: 'label' }),
        text: value,
        fontSize,
      }),
      strokeColor: toStyle(element).strokeColor,
    };
  };

  for (const element of object.elements) {
    const id = elementId(object.id, element.id);
    const style = toStyle(element);
    switch (element.kind) {
      case 'rect':
      case 'ellipse':
      case 'diamond': {
        const bounds = { x: point(element).x, y: point(element).y, w: length(element.w), h: length(element.h) };
        content[id] = {
          ...base({
            id,
            type: element.kind === 'rect' ? 'rectangle' : element.kind,
            ...bounds,
            index: index++,
            meta: meta(element, element.kind),
          }),
          ...style,
          angle: element.rotation !== undefined ? (element.rotation * Math.PI) / 180 : 0,
        };
        if (element.text) {
          label(element, element.text, bounds);
        }
        break;
      }
      case 'triangle': {
        // Excalidraw has no triangle primitive; render a closed polyline inscribed in the box.
        const bounds = { x: point(element).x, y: point(element).y, w: length(element.w), h: length(element.h) };
        const points: [number, number][] = [
          [bounds.w / 2, 0],
          [bounds.w, bounds.h],
          [0, bounds.h],
          [bounds.w / 2, 0],
        ];
        content[id] = {
          ...linear({ id, type: 'line', ...bounds, index: index++, meta: meta(element, 'triangle'), points }),
          ...style,
        };
        if (element.text) {
          label(element, element.text, bounds);
        }
        break;
      }
      case 'circle': {
        const bounds = {
          x: point({ x: element.cx - element.r, y: element.cy - element.r }).x,
          y: point({ x: element.cx - element.r, y: element.cy - element.r }).y,
          w: length(element.r * 2),
          h: length(element.r * 2),
        };
        content[id] = {
          ...base({ id, type: 'ellipse', ...bounds, index: index++, meta: meta(element, 'ellipse') }),
          ...style,
        };
        if (element.text) {
          label(element, element.text, bounds);
        }
        break;
      }
      case 'line':
      case 'curve':
      case 'arc': {
        const kind = element.kind === 'line' ? 'line' : 'curve';
        const raw =
          element.kind === 'arc'
            ? sampleArc(element)
            : element.kind === 'line' && element.closed
              ? [...element.points, element.points[0]]
              : [...element.points];
        const absolute = raw.map(point);
        const minX = Math.min(...absolute.map((p) => p.x));
        const minY = Math.min(...absolute.map((p) => p.y));
        content[id] = {
          ...linear({
            id,
            type: 'line',
            x: minX,
            y: minY,
            w: Math.max(...absolute.map((p) => p.x)) - minX,
            h: Math.max(...absolute.map((p) => p.y)) - minY,
            index: index++,
            meta: meta(element, kind),
            points: absolute.map((p) => [p.x - minX, p.y - minY]),
            roundness: kind === 'curve',
          }),
          ...style,
        };
        break;
      }
      case 'text': {
        const fontSize = toFontSize(element.weight);
        const size = textSize(element.text, fontSize);
        const position = point(element);
        content[id] = {
          ...text({
            id,
            type: 'text',
            x: position.x,
            y: position.y,
            w: element.w !== undefined ? length(element.w) : size.w,
            h: size.h,
            index: index++,
            meta: meta(element, 'text'),
            text: element.text,
            fontSize,
          }),
          strokeColor: style.strokeColor,
          autoResize: element.w === undefined,
        };
        break;
      }
      case 'arrow': {
        // Endpoints resolve to the center of the referenced element's box. Refs are remembered
        // in customData so they round-trip; native excalidraw bindings are a follow-up.
        const from = element.from ? ref(element.from) : undefined;
        const to = element.to ? ref(element.to) : undefined;
        const fromBox = from ? box(from) : undefined;
        const toBox = to ? box(to) : undefined;
        const start = fromBox
          ? { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }
          : point(element.start ?? { x: 0, y: 0 });
        const end = toBox
          ? { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 }
          : point(element.end ?? { x: 0, y: 0 });
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const bounds = {
          x: minX,
          y: minY,
          w: Math.abs(end.x - start.x),
          h: Math.abs(end.y - start.y),
        };
        content[id] = {
          ...linear({
            id,
            type: 'arrow',
            ...bounds,
            index: index++,
            meta: meta(element, 'arrow', { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
            points: [
              [start.x - minX, start.y - minY],
              [end.x - minX, end.y - minY],
            ],
          }),
          ...style,
        };
        if (element.text) {
          label(element, element.text, bounds);
        }
        break;
      }
    }
  }

  return content;
};

/** Sample an arc (degrees, clockwise from +x, y-down screen coords) into spline points. */
const sampleArc = ({ cx, cy, r, startAngle, endAngle }: Scene.Arc): Scene.Point[] => {
  const sweep = endAngle - startAngle;
  const steps = Math.max(4, Math.ceil(Math.abs(sweep) / 22.5));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = ((startAngle + (sweep * i) / steps) * Math.PI) / 180;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
};
