//
// Copyright 2026 DXOS.org
//

//
// Derives the neutral scene from excalidraw elements. Geometry is read from the live elements —
// not from a stored copy — so the agent's mental model stays coherent after users drag or
// resize shapes in the UI. An object's `origin` is the top-left of its bounding box.
//

import { type ReadResult, type ReadWorldObject, type Scene } from '@dxos/plugin-illustrator/model';

import { type CanvasContent, type ExternalBox } from './render';
import { readStyle, readTextStyle } from './style';

type ElementRecord = Record<string, any>;

/** Read the derived scene from canvas content. */
export const readScene = (content: CanvasContent): ReadResult => {
  const groups = new Map<string, ElementRecord[]>();
  let unmanaged = 0;
  for (const record of Object.values(content ?? {})) {
    if (!record || record.isDeleted) {
      continue;
    }
    const objectId = record.customData?.object;
    if (typeof objectId !== 'string' || typeof record.customData?.element !== 'string') {
      unmanaged++;
      continue;
    }
    groups.set(objectId, [...(groups.get(objectId) ?? []), record]);
  }

  const objects = [...groups.entries()].map(([objectId, records]) => readObject(objectId, records));
  return { scene: { objects }, unmanaged };
};

/** Canvas-px bounding boxes of all managed elements, keyed by `objectId/elementId`. */
export const elementBoxes = (content: CanvasContent): Record<string, ExternalBox> => {
  const boxes: Record<string, ExternalBox> = {};
  for (const record of Object.values(content ?? {})) {
    if (record && !record.isDeleted && record.customData?.object && record.customData?.element) {
      if (record.customData.part === 'label') {
        continue;
      }
      boxes[`${record.customData.object}/${record.customData.element}`] = bounds(record);
    }
  }
  return boxes;
};

const readObject = (objectId: string, records: ElementRecord[]): ReadWorldObject => {
  const shapes = records.filter((record) => record.customData.part !== 'label');
  // Labels are folded back into their parent element's `text`.
  const labels = new Map<string, string>(
    records
      .filter((record) => record.customData.part === 'label')
      .map((record) => [record.customData.element, record.text ?? '']),
  );

  const scale = shapes.find((record) => typeof record.customData?.scale === 'number')?.customData.scale ?? 1;
  const origin = {
    x: Math.min(...shapes.map((record) => bounds(record).x)),
    y: Math.min(...shapes.map((record) => bounds(record).y)),
  };
  const local = (abs: { x: number; y: number }): Scene.Point => ({
    x: round((abs.x - origin.x) / scale),
    y: round((abs.y - origin.y) / scale),
  });
  const length = (px: number) => round(px / scale);

  const elements = shapes
    .map((record) => readElement(record, { local, length, scale, objectId, labels }))
    .filter((element): element is Scene.Element => element !== undefined);

  return { id: objectId, origin, scale, elements };
};

type ReadContext = {
  local: (abs: { x: number; y: number }) => Scene.Point;
  length: (px: number) => number;
  scale: number;
  objectId: string;
  labels: Map<string, string>;
};

const readElement = (record: ElementRecord, ctx: ReadContext): Scene.Element | undefined => {
  const id = record.customData.element;
  const kind = record.customData.kind;
  const label = ctx.labels.get(id);
  switch (record.type) {
    case 'rectangle':
    case 'ellipse':
    case 'diamond': {
      const boxKind = kind === 'rect' || kind === 'diamond' || kind === 'ellipse' ? kind : 'ellipse';
      return {
        kind: boxKind,
        id,
        ...ctx.local({ x: record.x, y: record.y }),
        w: ctx.length(record.width),
        h: ctx.length(record.height),
        ...(record.angle ? { rotation: round((record.angle * 180) / Math.PI) } : {}),
        ...(label ? { text: label } : {}),
        ...readStyle(record),
      };
    }
    case 'text': {
      return {
        kind: 'text',
        id,
        ...ctx.local({ x: record.x, y: record.y }),
        ...(record.autoResize === false ? { w: ctx.length(record.width) } : {}),
        text: record.text ?? '',
        ...readTextStyle(record, ctx.scale),
      };
    }
    case 'line': {
      const points = linePoints(record).map((point) => ctx.local(point));
      if (kind === 'triangle') {
        // Read the inscribed polygon back as its bounding box.
        return {
          kind: 'triangle',
          id,
          ...ctx.local({ x: record.x, y: record.y }),
          w: ctx.length(record.width),
          h: ctx.length(record.height),
          ...(label ? { text: label } : {}),
          ...readStyle(record),
        };
      }
      if (kind === 'curve') {
        return { kind: 'curve', id, points, ...readStyle(record) };
      }
      const closed =
        points.length > 2 && points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;
      return {
        kind: 'line',
        id,
        points: closed ? points.slice(0, -1) : points,
        ...(closed ? { closed: true } : {}),
        ...readStyle(record),
      };
    }
    case 'arrow': {
      const points = linePoints(record);
      const start = points[0] ?? { x: record.x, y: record.y };
      const end = points[points.length - 1] ?? { x: record.x, y: record.y };
      const from = readRef(record.customData.from, ctx.objectId);
      const to = readRef(record.customData.to, ctx.objectId);
      return {
        kind: 'arrow',
        id,
        ...(from ? { from } : { start: ctx.local(start) }),
        ...(to ? { to } : { end: ctx.local(end) }),
        ...(label ? { text: label } : {}),
        ...readStyle(record),
      };
    }
    default:
      return undefined;
  }
};

/** Same-object refs are shortened back to the bare element id. */
const readRef = (ref: string | undefined, objectId: string): string | undefined => {
  if (!ref) {
    return undefined;
  }
  return ref.startsWith(`${objectId}/`) ? ref.slice(objectId.length + 1) : ref;
};

const linePoints = (record: ElementRecord): { x: number; y: number }[] =>
  (record.points ?? []).map((point: [number, number]) => ({ x: record.x + point[0], y: record.y + point[1] }));

/** Bounding box of an element in canvas px. */
const bounds = (record: ElementRecord): ExternalBox => ({
  x: record.x ?? 0,
  y: record.y ?? 0,
  w: record.width ?? 0,
  h: record.height ?? 0,
});

const round = (value: number) => Math.round(value * 100) / 100;
