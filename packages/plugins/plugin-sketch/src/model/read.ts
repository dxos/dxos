//
// Copyright 2026 DXOS.org
//

//
// Derives the neutral scene from tldraw records. Geometry is read from the live records —
// not from a stored copy — so the agent's mental model stays coherent after users drag or
// resize shapes in the UI. An object's `origin` is the top-left of its bounding box.
//

import { type CanvasContent } from './SketchBuilder';
import { type ExternalBox } from './render';
import type * as Scene from './scene';

/** A world object as derived from the canvas: placement is always resolved. */
export type ReadWorldObject = Scene.WorldObject & { origin: Scene.Point; scale: number };

export type ReadResult = {
  scene: { objects: ReadWorldObject[] };
  /** Shapes on the canvas not managed by the DSL (hand-drawn by users). */
  unmanaged: number;
};

type ShapeRecord = Record<string, any>;

/** Read the derived scene from canvas content. */
export const readScene = (content: CanvasContent): ReadResult => {
  const groups = new Map<string, ShapeRecord[]>();
  let unmanaged = 0;
  for (const record of Object.values(content ?? {})) {
    if (record?.typeName !== 'shape') {
      continue;
    }
    const objectId = record.meta?.object;
    if (typeof objectId !== 'string' || typeof record.meta?.element !== 'string') {
      unmanaged++;
      continue;
    }
    groups.set(objectId, [...(groups.get(objectId) ?? []), record]);
  }

  const objects = [...groups.entries()].map(([objectId, records]) => readObject(objectId, records, content));
  return { scene: { objects }, unmanaged };
};

/** Canvas-px bounding boxes of all managed elements, keyed by `objectId/elementId`. */
export const elementBoxes = (content: CanvasContent): Record<string, ExternalBox> => {
  const boxes: Record<string, ExternalBox> = {};
  for (const record of Object.values(content ?? {})) {
    if (record?.typeName === 'shape' && record.meta?.object && record.meta?.element) {
      boxes[`${record.meta.object}/${record.meta.element}`] = bounds(record);
    }
  }
  return boxes;
};

const readObject = (objectId: string, records: ShapeRecord[], content: CanvasContent): ReadWorldObject => {
  const scale = records.find((record) => typeof record.meta?.scale === 'number')?.meta.scale ?? 1;
  const origin = {
    x: Math.min(...records.map((record) => bounds(record).x)),
    y: Math.min(...records.map((record) => bounds(record).y)),
  };
  const local = (abs: { x: number; y: number }): Scene.Point => ({
    x: round((abs.x - origin.x) / scale),
    y: round((abs.y - origin.y) / scale),
  });
  const length = (px: number) => round(px / scale);

  const elements = records
    .map((record) => readElement(record, { local, length, objectId, content }))
    .filter((element): element is Scene.Element => element !== undefined);

  return { id: objectId, origin, scale, elements };
};

type ReadContext = {
  local: (abs: { x: number; y: number }) => Scene.Point;
  length: (px: number) => number;
  objectId: string;
  content: CanvasContent;
};

const readElement = (record: ShapeRecord, ctx: ReadContext): Scene.Element | undefined => {
  const id = record.meta.element;
  const kind = record.meta.kind;
  switch (record.type) {
    case 'geo': {
      const boxKind = kind === 'rect' || kind === 'diamond' || kind === 'triangle' ? kind : 'ellipse';
      return {
        kind: boxKind,
        id,
        ...ctx.local({ x: record.x, y: record.y }),
        w: ctx.length(record.props.w),
        h: ctx.length(record.props.h),
        ...(record.rotation ? { rotation: round((record.rotation * 180) / Math.PI) } : {}),
        ...(record.props.text ? { text: record.props.text } : {}),
        ...readStyle(record),
      };
    }
    case 'text': {
      return {
        kind: 'text',
        id,
        ...ctx.local({ x: record.x, y: record.y }),
        ...(record.props.autoSize ? {} : { w: ctx.length(record.props.w) }),
        text: record.props.text ?? '',
        ...readStyle(record),
      };
    }
    case 'line': {
      const points = linePoints(record).map((point) => ctx.local({ x: record.x + point.x, y: record.y + point.y }));
      if (kind === 'curve') {
        return { kind: 'curve', id, points, ...readStyle(record) };
      }
      const closed =
        points.length > 2 &&
        points[0].x === points[points.length - 1].x &&
        points[0].y === points[points.length - 1].y;
      return {
        kind: 'line',
        id,
        points: closed ? points.slice(0, -1) : points,
        ...(closed ? { closed: true } : {}),
        ...readStyle(record),
      };
    }
    case 'arrow': {
      const { from, to } = arrowRefs(record, ctx);
      return {
        kind: 'arrow',
        id,
        ...(from ? { from } : { start: ctx.local({ x: record.x + record.props.start.x, y: record.y + record.props.start.y }) }),
        ...(to ? { to } : { end: ctx.local({ x: record.x + record.props.end.x, y: record.y + record.props.end.y }) }),
        ...(record.props.text ? { text: record.props.text } : {}),
        ...readStyle(record),
      };
    }
    default:
      return undefined;
  }
};

/** Resolve arrow terminal bindings back to element refs (same-object refs are shortened). */
const arrowRefs = (record: ShapeRecord, ctx: ReadContext): { from?: string; to?: string } => {
  const refs: { from?: string; to?: string } = {};
  for (const binding of Object.values(ctx.content ?? {})) {
    if (binding?.typeName !== 'binding' || binding.fromId !== record.id) {
      continue;
    }
    const target = ctx.content[binding.toId];
    if (!target?.meta?.object || !target?.meta?.element) {
      continue;
    }
    const ref =
      target.meta.object === ctx.objectId ? target.meta.element : `${target.meta.object}/${target.meta.element}`;
    if (binding.props?.terminal === 'start') {
      refs.from = ref;
    } else {
      refs.to = ref;
    }
  }
  return refs;
};

/** Report only non-default styles to keep the read output compact. */
const readStyle = (record: ShapeRecord): Partial<Pick<Scene.Box, 'color' | 'fill' | 'stroke' | 'weight'>> => {
  const { color, fill, dash, size } = record.props;
  return {
    ...(color && color !== 'black' ? { color } : {}),
    ...(fill && fill !== 'none' ? { fill: fill === 'pattern' ? ('pattern' as const) : ('solid' as const) } : {}),
    ...(dash && dash !== 'draw' ? { stroke: dash as Scene.Stroke } : {}),
    ...(size && size !== 'm' ? { weight: size as Scene.Weight } : {}),
  };
};

const linePoints = (record: ShapeRecord): { x: number; y: number }[] =>
  Object.values(record.props.points ?? {})
    // Indexes are `a<n>` fractional keys; numeric compare so `a10` sorts after `a2`.
    .sort((a: any, b: any) => Number(String(a.index).slice(1)) - Number(String(b.index).slice(1)))
    .map((point: any) => ({ x: point.x, y: point.y }));

/** Bounding box of a shape record in canvas px. */
const bounds = (record: ShapeRecord): ExternalBox => {
  switch (record.type) {
    case 'geo':
      return { x: record.x, y: record.y, w: record.props.w, h: record.props.h };
    case 'text':
      return { x: record.x, y: record.y, w: record.props.w ?? 0, h: 0 };
    case 'line': {
      const points = linePoints(record);
      const xs = points.map((point) => record.x + point.x);
      const ys = points.map((point) => record.y + point.y);
      return boxFrom(xs, ys);
    }
    case 'arrow': {
      const xs = [record.x + record.props.start.x, record.x + record.props.end.x];
      const ys = [record.y + record.props.start.y, record.y + record.props.end.y];
      return boxFrom(xs, ys);
    }
    default:
      return { x: record.x ?? 0, y: record.y ?? 0, w: record.props?.w ?? 0, h: record.props?.h ?? 0 };
  }
};

const boxFrom = (xs: number[], ys: number[]): ExternalBox => {
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

const round = (value: number) => Math.round(value * 100) / 100;
