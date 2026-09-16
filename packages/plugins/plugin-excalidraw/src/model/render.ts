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

import { toFontSize, toStyle } from './style.ts';

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
/**
 * Excalidraw's handwriting face (`fontFamily: 1`) is fetched lazily from `EXCALIDRAW_ASSET_PATH`,
 * which the host app does not serve, so those glyphs paint blank; the system face always resolves.
 */
const FONT_FAMILY = 2;
/** Distance held between an arrow tip and the shape it binds to, matching excalidraw's own gap. */
const BINDING_GAP = 4;

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
  fontFamily: FONT_FAMILY,
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

const center = (box: ExternalBox): Scene.Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

/**
 * Point where the segment from a box's centre towards `toward` crosses the box outline, pushed out
 * by `gap`. Arrows drawn centre-to-centre disappear under their shapes, so each end is clipped to
 * the boundary; excalidraw then maintains the same contact point once the binding takes over.
 */
const edgePoint = (box: ExternalBox, toward: Scene.Point, gap: number): Scene.Point => {
  const origin = center(box);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  if (dx === 0 && dy === 0) {
    return origin;
  }
  // Scale the direction until it first touches a vertical or horizontal face.
  const scaleX = dx === 0 ? Infinity : box.w / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : box.h / 2 / Math.abs(dy);
  const hit = Math.min(scaleX, scaleY);
  const length = Math.hypot(dx, dy);
  const offset = hit + gap / length;
  return { x: origin.x + dx * offset, y: origin.y + dy * offset };
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

  /**
   * Label as a companion text element bound to its shape, folded back into `text` on read.
   * Binding makes excalidraw own the centring and keeps the two together — an unbound label is a
   * separate shape the user can drag off the box it names.
   */
  const label = (element: Scene.Element, value: string, bounds: ExternalBox) => {
    const containerId = elementId(object.id, element.id);
    const id = `${containerId}__label`;
    // Type scales with the object so a label stays proportionate to the shape enclosing it.
    const fontSize = toFontSize(element.weight) * scale;
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
      containerId,
      textAlign: 'center',
      verticalAlign: 'middle',
      autoResize: false,
    };
    const container = content[containerId];
    if (container) {
      container.boundElements = [...(container.boundElements ?? []), { id, type: 'text' }];
    }
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
        const fontSize = toFontSize(element.weight) * scale;
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
        // Endpoints are clipped to the referenced shape's outline and bound to it, so the arrow
        // touches the shape and follows it when dragged. Refs stay in customData to round-trip.
        const from = element.from ? ref(element.from) : undefined;
        const to = element.to ? ref(element.to) : undefined;
        const fromBox = from ? box(from) : undefined;
        const toBox = to ? box(to) : undefined;
        const startAnchor = fromBox ? center(fromBox) : point(element.start ?? { x: 0, y: 0 });
        const endAnchor = toBox ? center(toBox) : point(element.end ?? { x: 0, y: 0 });
        const start = fromBox ? edgePoint(fromBox, endAnchor, BINDING_GAP) : startAnchor;
        const end = toBox ? edgePoint(toBox, startAnchor, BINDING_GAP) : endAnchor;
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
          ...(from && fromBox ? { startBinding: { elementId: from, focus: 0, gap: BINDING_GAP } } : {}),
          ...(to && toBox ? { endBinding: { elementId: to, focus: 0, gap: BINDING_GAP } } : {}),
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

type BoundEntry = { id: string; type: string };

/**
 * Reconcile arrow bindings across the whole canvas: drop bindings whose shape is gone and mirror
 * the survivors onto each shape's `boundElements`. Excalidraw discards a one-sided binding, and
 * arrows may reference shapes belonging to other objects, so this runs once the map is complete.
 */
export const rebind = (content: CanvasContent): void => {
  const alive = (id: unknown): boolean => typeof id === 'string' && !!content[id] && !content[id].isDeleted;
  const arrowsByShape = new Map<string, BoundEntry[]>();

  for (const [key, record] of Object.entries(content ?? {})) {
    if (!record || record.isDeleted || record.type !== 'arrow') {
      continue;
    }
    const arrowId = record.id ?? key;
    for (const end of ['startBinding', 'endBinding'] as const) {
      const elementId = record[end]?.elementId;
      if (elementId === undefined) {
        continue;
      }
      if (!alive(elementId)) {
        record[end] = null;
        continue;
      }
      arrowsByShape.set(elementId, [...(arrowsByShape.get(elementId) ?? []), { id: arrowId, type: 'arrow' }]);
    }
  }

  for (const [key, record] of Object.entries(content ?? {})) {
    if (!record || record.isDeleted || record.type === 'arrow') {
      continue;
    }
    // Preserve non-arrow bindings (e.g. container text) the renderer does not own.
    const kept = (record.boundElements ?? []).filter((entry: BoundEntry) => entry?.type !== 'arrow');
    const next = [...kept, ...(arrowsByShape.get(record.id ?? key) ?? [])];
    record.boundElements = next.length > 0 ? next : null;
  }
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
