//
// Copyright 2026 DXOS.org
//

//
// tldraw backend for the scene DSL: compiles a `WorldObject` into tldraw records.
// Element identity is stamped into each record's `meta` (`{ object, element, kind, scale }`)
// so `read.ts` can reconstruct the scene and edits can address records by id.
//

import {
  type CanvasContent,
  type ConnectorProps,
  type Dash,
  type Fill,
  type PathProps,
  type Point,
  type ShapeProps,
  SketchBuilder,
} from './SketchBuilder';
import * as Scene from './scene';

export const DEFAULT_SCALE = 1;

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

/** Stable record id for an element: `shape:<objectId>/<elementId>`. */
export const shapeId = (objectId: string, elementId: string) => `shape:${objectId}/${elementId}`;

const strokeToDash: Record<Scene.Stroke, Dash> = {
  sketchy: 'draw',
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

const fillToFill: Record<Scene.Fill, Fill> = {
  none: 'none',
  solid: 'solid',
  pattern: 'pattern',
};

const boxKindToGeo = {
  rect: 'rectangle',
  ellipse: 'ellipse',
  diamond: 'diamond',
  triangle: 'triangle',
} as const;

const style = (element: Scene.Element): Pick<ShapeProps, 'color' | 'fill' | 'dash' | 'size'> => ({
  color: element.color,
  fill: 'fill' in element && element.fill ? fillToFill[element.fill] : undefined,
  dash: element.stroke ? strokeToDash[element.stroke] : undefined,
  size: element.weight,
});

/**
 * Compile one world object into tldraw records (canvas-px coordinates).
 * Local coordinates are mapped via `canvas = origin + local * scale`.
 */
export const renderObject = (object: Scene.WorldObject, options: RenderOptions): CanvasContent => {
  const { origin, scale, indexStart, external = {}, dialect = 'scene' } = options;
  const point = (local: Scene.Point | { x: number; y: number }): Point => ({
    x: origin.x + local.x * scale,
    y: origin.y + local.y * scale,
  });
  const length = (units: number) => units * scale;

  const kinds = new Map<string, string>();
  const builder = new SketchBuilder({
    indexStart,
    metaFor: (handle) => {
      const [objectId, elementId] = splitHandle(handle);
      return { object: objectId, element: elementId, kind: kinds.get(handle), scale, dialect };
    },
  });

  // Register existing canvas elements so arrows can bind across objects.
  for (const [handle, box] of Object.entries(external)) {
    builder.external(handle, box);
  }

  // Refs are element ids within this object, or `objectId/elementId` across objects.
  const ref = (value: string) => (value.includes('/') ? value : `${object.id}/${value}`);

  for (const element of object.elements) {
    const handle = `${object.id}/${element.id}`;
    kinds.set(handle, element.kind);
    switch (element.kind) {
      case 'rect':
      case 'ellipse':
      case 'diamond':
      case 'triangle': {
        builder.geo(boxKindToGeo[element.kind], {
          id: handle,
          ...point(element),
          w: length(element.w),
          h: length(element.h),
          rotation: element.rotation !== undefined ? (element.rotation * Math.PI) / 180 : undefined,
          text: element.text,
          ...style(element),
        });
        break;
      }
      case 'circle': {
        kinds.set(handle, 'ellipse');
        builder.circle({
          id: handle,
          ...point({ x: element.cx - element.r, y: element.cy - element.r }),
          w: length(element.r * 2),
          text: element.text,
          ...style(element),
        });
        break;
      }
      case 'line': {
        const props: PathProps = {
          id: handle,
          points: element.points.map(point),
          closed: element.closed,
          ...style(element),
        };
        builder.path(props);
        break;
      }
      case 'curve': {
        builder.path({ id: handle, points: element.points.map(point), smooth: true, ...style(element) });
        break;
      }
      case 'arc': {
        kinds.set(handle, 'curve');
        builder.path({ id: handle, points: sampleArc(element).map(point), smooth: true, ...style(element) });
        break;
      }
      case 'text': {
        builder.text({
          id: handle,
          ...point(element),
          w: element.w !== undefined ? length(element.w) : undefined,
          text: element.text,
          color: element.color,
          size: element.weight,
        });
        break;
      }
      case 'arrow': {
        const props: ConnectorProps = {
          id: handle,
          from: element.from ? ref(element.from) : undefined,
          to: element.to ? ref(element.to) : undefined,
          start: element.start ? point(element.start) : undefined,
          end: element.end ? point(element.end) : undefined,
          text: element.text,
          ...style(element),
        };
        builder.arrow(props);
        break;
      }
    }
  }

  return builder.records();
};

/** `objectId/elementId` — element ids may themselves not contain `/`. */
const splitHandle = (handle: string): [string, string] => {
  const index = handle.indexOf('/');
  return [handle.slice(0, index), handle.slice(index + 1)];
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
