//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  Arrangement,
  type Dimension,
  Element2D,
  Element3D,
  type LayoutRecord,
  type LayoutRecord2D,
  type LayoutRecord3D,
  Size2,
  Vec2,
  Vec3,
} from './Scene.ts';

type Element = Element2D | Element3D;

/** One edit to a layout's elements; geometric intents carry the values of the layout's dimension. */
export type LayoutIntent =
  | { readonly kind: 'create'; readonly element: Element }
  | { readonly kind: 'delete'; readonly ids: readonly string[] }
  | { readonly kind: 'update'; readonly id: string; readonly path: readonly string[]; readonly value?: unknown }
  | { readonly kind: 'reorder'; readonly id: string; readonly order: string }
  | { readonly kind: 'group'; readonly id: string; readonly members: readonly string[]; readonly arrange?: Arrangement }
  | { readonly kind: 'ungroup'; readonly id: string }
  | { readonly kind: 'bind'; readonly link: Element }
  | { readonly kind: 'move'; readonly ids: readonly string[]; readonly delta: Vec2 | Vec3 }
  | { readonly kind: 'rotate'; readonly ids: readonly string[]; readonly delta: number | Vec3 }
  | { readonly kind: 'scale'; readonly ids: readonly string[]; readonly factor: Size2 | Vec3 }
  | {
      readonly kind: 'extrude';
      readonly id: string;
      readonly target: string;
      readonly face: Vec3;
      readonly distance: number;
    }
  | { readonly kind: 'join'; readonly id: string; readonly operands: readonly string[] }
  | { readonly kind: 'subtract'; readonly id: string; readonly base: string; readonly tool: string }
  | { readonly kind: 'batch'; readonly intents: readonly LayoutIntent[] };

const ElementSchema = Schema.Union([Element3D, Element2D]);
const ids = Schema.Array(Schema.String);

export const LayoutIntent: Schema.Codec<LayoutIntent> = Schema.Union([
  Schema.Struct({ kind: Schema.Literal('create'), element: ElementSchema }),
  Schema.Struct({ kind: Schema.Literal('delete'), ids }),
  Schema.Struct({
    kind: Schema.Literal('update'),
    id: Schema.String,
    path: Schema.Array(Schema.String),
    value: Schema.optional(Schema.Unknown),
  }),
  Schema.Struct({ kind: Schema.Literal('reorder'), id: Schema.String, order: Schema.String }),
  Schema.Struct({
    kind: Schema.Literal('group'),
    id: Schema.String,
    members: ids,
    arrange: Schema.optional(Arrangement),
  }),
  Schema.Struct({ kind: Schema.Literal('ungroup'), id: Schema.String }),
  Schema.Struct({ kind: Schema.Literal('bind'), link: ElementSchema }),
  Schema.Struct({ kind: Schema.Literal('move'), ids, delta: Schema.Union([Vec3, Vec2]) }),
  Schema.Struct({ kind: Schema.Literal('rotate'), ids, delta: Schema.Union([Schema.Number, Vec3]) }),
  Schema.Struct({ kind: Schema.Literal('scale'), ids, factor: Schema.Union([Vec3, Size2]) }),
  Schema.Struct({
    kind: Schema.Literal('extrude'),
    id: Schema.String,
    target: Schema.String,
    face: Vec3,
    distance: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal('join'), id: Schema.String, operands: ids }),
  Schema.Struct({ kind: Schema.Literal('subtract'), id: Schema.String, base: Schema.String, tool: Schema.String }),
  Schema.Struct({
    kind: Schema.Literal('batch'),
    intents: Schema.Array(Schema.suspend((): Schema.Codec<LayoutIntent> => LayoutIntent)),
  }),
]);

const isIntent = Schema.is(LayoutIntent);
const isVec3 = Schema.is(Vec3);
const isElement2D = Schema.is(Element2D);
const isElement3D = Schema.is(Element3D);

/** Whether `value` is an intent, and, given the layout's dimension, whether its geometry is that dimension's. */
export const isLayoutIntent = (value: unknown, dim?: Dimension): value is LayoutIntent =>
  isIntent(value) && (dim === undefined || fitsDimension(value, dim));

const fitsDimension = (intent: LayoutIntent, dim: Dimension): boolean => {
  switch (intent.kind) {
    case 'move':
      return isVec3(intent.delta) === (dim === '3d');
    case 'rotate':
      return typeof intent.delta === 'number' ? dim === '2d' : dim === '3d';
    case 'scale':
      return isVec3(intent.factor) === (dim === '3d');
    case 'extrude':
    case 'join':
    case 'subtract':
      return dim === '3d';
    case 'batch':
      return intent.intents.every((inner) => fitsDimension(inner, dim));
    default:
      return true;
  }
};

const round = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/** Sets (or, with no value, unsets) `path` inside `value`, copying each record on the way. */
const setPath = (value: unknown, path: readonly string[], next: unknown): unknown => {
  const record: Record<string, unknown> = typeof value === 'object' && value !== null ? { ...value } : {};
  const [key, ...rest] = path;
  if (key === undefined) {
    return next;
  }
  const inner = rest.length === 0 ? next : setPath(record[key], rest, next);
  if (inner === undefined) {
    delete record[key];
  } else {
    record[key] = inner;
  }
  return record;
};

type Elements<E> = Readonly<Record<string, E>>;

type SolidIntent = Extract<LayoutIntent, { kind: 'extrude' | 'join' | 'subtract' }>;

/** The elements a solid intent builds from, in operation order. */
const solidIntentInputs = (intent: SolidIntent): string[] => {
  switch (intent.kind) {
    case 'extrude':
      return [intent.target];
    case 'join':
      return [...intent.operands];
    case 'subtract':
      return [intent.base, intent.tool];
  }
};

/** The elements a stored solid builds from, as the `solid` element's props name them. */
const solidInputs = (element: Element | undefined): string[] => {
  if (element?.kind !== 'solid') {
    return [];
  }
  const operands = element.props?.operands;
  const target = element.props?.target;
  return [
    ...(typeof operands === 'string' ? operands.split(/\s+/).filter(Boolean) : []),
    ...(typeof target === 'string' ? [target] : []),
  ];
};

/** The structure of intents shared by both dimensions; geometry goes to `geometry`. Undefined when nothing changed. */
const reduce = <E extends Element>(
  elements: Elements<E>,
  intent: LayoutIntent,
  isElement: (value: unknown) => value is E,
  geometry: (element: E, intent: LayoutIntent) => E | undefined,
  solid: (intent: SolidIntent) => E | undefined,
): Elements<E> | undefined => {
  switch (intent.kind) {
    case 'create':
    case 'bind': {
      const element = intent.kind === 'create' ? intent.element : intent.link;
      const bound = [element.from, element.to].every((end) => end === undefined || elements[end.element] !== undefined);
      return isElement(element) && bound && elements[element.id] === undefined
        ? { ...elements, [element.id]: element }
        : undefined;
    }
    case 'delete': {
      const gone = new Set(intent.ids.filter((id) => elements[id] !== undefined));
      if (gone.size === 0) {
        return undefined;
      }
      const boundTo = (element: E) => [element.from, element.to].some((end) => end && gone.has(end.element));
      // A deleted solid's operands are drawn again, unless a solid that stays still builds from them.
      const kept = Object.values(elements).filter((element) => !gone.has(element.id));
      const stillUsed = new Set(kept.flatMap(solidInputs));
      const shown = new Set(
        [...gone].flatMap((id) => solidInputs(elements[id])).filter((id) => !stillUsed.has(id) && !gone.has(id)),
      );
      return Object.fromEntries(
        Object.entries(elements).flatMap(([id, element]): [string, E][] => {
          if (gone.has(id) || boundTo(element)) {
            return [];
          }
          const members = element.members?.filter((member) => !gone.has(member));
          const next = members && members.length !== element.members?.length ? { ...element, members } : element;
          const unhidden = shown.has(id) ? setPath(next, ['hidden'], undefined) : next;
          return [[id, isElement(unhidden) ? unhidden : next]];
        }),
      );
    }
    case 'extrude':
    case 'join':
    case 'subtract': {
      const inputs = solidIntentInputs(intent);
      const valid =
        elements[intent.id] === undefined &&
        inputs.length > 0 &&
        inputs.every((id) => id !== intent.id && elements[id] !== undefined);
      const made = valid ? solid(intent) : undefined;
      if (!made) {
        return undefined;
      }
      // A solid stands for its base operand (the first), so it keeps that operand's look.
      const style = elements[inputs[0]]?.style;
      const element = style ? { ...made, style } : made;
      // A solid draws in place of its operands, so they are hidden (and shown again when it is deleted).
      return {
        ...elements,
        ...Object.fromEntries(inputs.map((id) => [id, { ...elements[id], hidden: true }])),
        [intent.id]: element,
      };
    }
    case 'update': {
      const element = elements[intent.id];
      const next = element && setPath(element, intent.path, intent.value);
      return next !== undefined && isElement(next) ? { ...elements, [intent.id]: next } : undefined;
    }
    case 'reorder': {
      const element = elements[intent.id];
      return element ? { ...elements, [intent.id]: { ...element, order: intent.order } } : undefined;
    }
    case 'group': {
      const members = intent.members.filter((id) => elements[id] !== undefined);
      const group = { id: intent.id, kind: 'group', members, ...(intent.arrange ? { arrange: intent.arrange } : {}) };
      return members.length > 0 && elements[intent.id] === undefined && isElement(group)
        ? { ...elements, [intent.id]: group }
        : undefined;
    }
    case 'ungroup': {
      if (elements[intent.id]?.kind !== 'group') {
        return undefined;
      }
      const { [intent.id]: _group, ...rest } = elements;
      return rest;
    }
    case 'move':
    case 'rotate':
    case 'scale': {
      const changed = intent.ids.flatMap((id): [string, E][] => {
        const element = elements[id];
        const next = element && geometry(element, intent);
        return next ? [[id, next]] : [];
      });
      if (changed.length === 0) {
        return undefined;
      }
      // A person moving a member of an arranged group placed it, so re-arranging leaves it there.
      const arranged = new Set(
        Object.values(elements).flatMap((element) => (element.arrange ? (element.members ?? []) : [])),
      );
      return {
        ...elements,
        ...Object.fromEntries(
          changed.map(([id, element]) => [
            id,
            intent.kind === 'move' && arranged.has(id) ? { ...element, pinned: true } : element,
          ]),
        ),
      };
    }
    case 'batch': {
      let current = elements;
      for (const inner of intent.intents) {
        current = reduce(current, inner, isElement, geometry, solid) ?? current;
      }
      return current === elements ? undefined : current;
    }
  }
};

const geometry2D = (element: Element2D, intent: LayoutIntent): Element2D | undefined => {
  if (intent.kind === 'move' && element.center && !isVec3(intent.delta)) {
    const { x, y } = intent.delta;
    return { ...element, center: { x: round(element.center.x + x), y: round(element.center.y + y) } };
  }
  if (intent.kind === 'rotate' && typeof intent.delta === 'number') {
    return { ...element, rotation: round((element.rotation ?? 0) + intent.delta) };
  }
  if (intent.kind === 'scale' && element.size && !isVec3(intent.factor)) {
    const { width, height } = intent.factor;
    return {
      ...element,
      size: { width: round(element.size.width * width), height: round(element.size.height * height) },
    };
  }
  return undefined;
};

/** A `solid` element whose operation tree is in `props`, as the `.dx` `solid` statement writes it. */
const solid3D = (intent: SolidIntent): Element3D => {
  switch (intent.kind) {
    case 'join':
      return { id: intent.id, kind: 'solid', props: { op: 'union', operands: intent.operands.join(' ') } };
    case 'subtract':
      return { id: intent.id, kind: 'solid', props: { op: 'difference', operands: `${intent.base} ${intent.tool}` } };
    case 'extrude':
      return {
        id: intent.id,
        kind: 'solid',
        props: { op: 'extrude', target: intent.target, face: intent.face, distance: round(intent.distance) },
      };
  }
};

const add3 = (left: Vec3, right: Vec3): Vec3 => ({
  x: round(left.x + right.x),
  y: round(left.y + right.y),
  z: round(left.z + right.z),
});

const geometry3D = (element: Element3D, intent: LayoutIntent): Element3D | undefined => {
  // An element with no centre is drawn at the origin, so a move places it at the delta.
  if (intent.kind === 'move' && isVec3(intent.delta)) {
    return { ...element, center: add3(element.center ?? { x: 0, y: 0, z: 0 }, intent.delta) };
  }
  if (intent.kind === 'rotate' && typeof intent.delta !== 'number') {
    return { ...element, rotation: add3(element.rotation ?? { x: 0, y: 0, z: 0 }, intent.delta) };
  }
  if (intent.kind === 'scale' && isVec3(intent.factor)) {
    const scale = element.scale ?? { x: 1, y: 1, z: 1 };
    const { x, y, z } = intent.factor;
    return { ...element, scale: { x: round(scale.x * x), y: round(scale.y * y), z: round(scale.z * z) } };
  }
  return undefined;
};

/**
 * The layout with `intent` applied; the same layout when it changes nothing (an id that is missing, geometry of the
 * other dimension). Pure: the caller writes the result.
 */
export function applyIntent(layout: LayoutRecord2D, intent: LayoutIntent): LayoutRecord2D;
export function applyIntent(layout: LayoutRecord3D, intent: LayoutIntent): LayoutRecord3D;
export function applyIntent(layout: LayoutRecord, intent: LayoutIntent): LayoutRecord;
export function applyIntent(layout: LayoutRecord, intent: LayoutIntent): LayoutRecord {
  if (layout.dim === '2d') {
    const elements = reduce(layout.elements, intent, isElement2D, geometry2D, () => undefined);
    return elements ? { ...layout, elements } : layout;
  }
  const elements = reduce(layout.elements, intent, isElement3D, geometry3D, solid3D);
  return elements ? { ...layout, elements } : layout;
}
