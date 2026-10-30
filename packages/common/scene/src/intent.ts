//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { endpointNode } from './element.ts';
import {
  Constraint,
  type Dimension,
  Element2D,
  Element3D,
  Lattice,
  type LayoutRecord,
  type LayoutRecord2D,
  type LayoutRecord3D,
  Size2,
  Vec2,
  Vec3,
} from './Scene.ts';

type Element = Element2D | Element3D;

/**
 * The 2D layout fields a `layout` intent writes (the modes that place its elements): a key set to a value sets the
 * field, a key set to `undefined` unsets it, and an absent key leaves it.
 */
export type LayoutPatch = {
  readonly lattice?: Lattice;
  readonly constraints?: readonly Constraint[];
};

export const LayoutPatch: Schema.Codec<LayoutPatch> = Schema.Struct({
  lattice: Schema.optional(Lattice),
  constraints: Schema.optional(Schema.Array(Constraint)),
});

/**
 * One edit to a layout: to its elements (geometric intents carry the values of the layout's dimension) or, with
 * `layout`, to its own fields, so a mode's model is written and undone in the same batch as the elements it places.
 */
export type LayoutIntent =
  | { readonly kind: 'create'; readonly element: Element }
  | { readonly kind: 'delete'; readonly ids: readonly string[] }
  | { readonly kind: 'update'; readonly id: string; readonly path: readonly string[]; readonly value?: unknown }
  | { readonly kind: 'reorder'; readonly id: string; readonly order: string }
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
  | { readonly kind: 'layout'; readonly patch: LayoutPatch }
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
  Schema.Struct({ kind: Schema.Literal('layout'), patch: LayoutPatch }),
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
    case 'layout':
      return dim === '2d';
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
  if (element?.type !== 'solid') {
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
  arranged = false,
): Elements<E> | undefined => {
  switch (intent.kind) {
    case 'create':
    case 'bind': {
      const element = intent.kind === 'create' ? intent.element : intent.link;
      const bound = [element.source, element.target].every(
        (end) => end === undefined || end.node === undefined || elements[end.node] !== undefined,
      );
      return isElement(element) && bound && elements[element.id] === undefined
        ? { ...elements, [element.id]: element }
        : undefined;
    }
    case 'delete': {
      const gone = new Set(intent.ids.filter((id) => elements[id] !== undefined));
      if (gone.size === 0) {
        return undefined;
      }
      const boundTo = (element: E) =>
        [element.source, element.target].some((end) => end && gone.has(endpointNode(end) ?? ''));
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
          const unhidden = shown.has(id) ? setPath(element, ['hidden'], undefined) : element;
          return [[id, isElement(unhidden) ? unhidden : element]];
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
      const base = elements[inputs[0]];
      const element = {
        ...made,
        ...(base?.style !== undefined ? { style: base.style } : {}),
        ...(base?.overrides !== undefined ? { overrides: base.overrides } : {}),
      };
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
      return element ? { ...elements, [intent.id]: { ...element, z: intent.order } } : undefined;
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
      // A person moving an element of an arranged layout placed it, so re-arranging leaves it there.
      return {
        ...elements,
        ...Object.fromEntries(
          changed.map(([id, element]) => [
            id,
            intent.kind === 'move' && arranged ? { ...element, pinned: true } : element,
          ]),
        ),
      };
    }
    case 'layout':
      return undefined;
    case 'batch': {
      let current = elements;
      for (const inner of intent.intents) {
        current = reduce(current, inner, isElement, geometry, solid, arranged) ?? current;
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
      return { id: intent.id, type: 'solid', props: { op: 'union', operands: intent.operands.join(' ') } };
    case 'subtract':
      return { id: intent.id, type: 'solid', props: { op: 'difference', operands: `${intent.base} ${intent.tool}` } };
    case 'extrude':
      return {
        id: intent.id,
        type: 'solid',
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

/** The layout fields `intent` writes, its batches' patches merged in order; undefined when it writes none. */
const patchOf = (intent: LayoutIntent): LayoutPatch | undefined => {
  switch (intent.kind) {
    case 'layout':
      return intent.patch;
    case 'batch':
      return intent.intents.reduce<LayoutPatch | undefined>((merged, inner) => {
        const patch = patchOf(inner);
        return patch ? { ...merged, ...patch } : merged;
      }, undefined);
    default:
      return undefined;
  }
};

/** `layout` with `patch`'s fields written; the same layout when every value is already there. */
const patchLayout = (layout: LayoutRecord2D, patch: LayoutPatch | undefined): LayoutRecord2D => {
  let next = layout;
  if (patch && 'lattice' in patch && !sameElement(next.lattice, patch.lattice)) {
    const { lattice: _lattice, ...rest } = next;
    next = patch.lattice === undefined ? rest : { ...rest, lattice: patch.lattice };
  }
  if (patch && 'constraints' in patch && !sameElement(next.constraints, patch.constraints)) {
    const { constraints: _constraints, ...rest } = next;
    next = patch.constraints === undefined ? rest : { ...rest, constraints: patch.constraints };
  }
  return next;
};

/**
 * The layout with `intent` applied; the same layout when it changes nothing (an id that is missing, geometry of the
 * other dimension, layout fields 3D does not have). Pure: the caller writes the result.
 */
export function applyIntent(layout: LayoutRecord2D, intent: LayoutIntent): LayoutRecord2D;
export function applyIntent(layout: LayoutRecord3D, intent: LayoutIntent): LayoutRecord3D;
export function applyIntent(layout: LayoutRecord, intent: LayoutIntent): LayoutRecord;
export function applyIntent(layout: LayoutRecord, intent: LayoutIntent): LayoutRecord {
  if (layout.dim === '2d') {
    const elements = reduce(layout.elements, intent, isElement2D, geometry2D, () => undefined, !!layout.arrange);
    return patchLayout(elements ? { ...layout, elements } : layout, patchOf(intent));
  }
  const elements = reduce(layout.elements, intent, isElement3D, geometry3D, solid3D, !!layout.arrange);
  return elements ? { ...layout, elements } : layout;
}

const sameElement = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/**
 * One batch that takes a layout's elements from `before` to `after`, in either dimension: deletions, then creations
 * (shapes before links, so a link's ends exist when it is created), then whole-element updates. Writers emit it rather
 * than assigning records, so every write goes through the one intent vocabulary.
 */
export const layoutChanges = <E extends Element>(
  before: { readonly [id: string]: E },
  after: { readonly [id: string]: E },
): LayoutIntent => {
  const removed = Object.keys(before).filter((id) => after[id] === undefined);
  const added = Object.values(after).filter((element) => before[element.id] === undefined);
  const isLink = (element: E) => element.source !== undefined || element.target !== undefined;
  const changed = Object.values(after).filter(
    (element) => before[element.id] !== undefined && !sameElement(before[element.id], element),
  );
  return {
    kind: 'batch',
    intents: [
      ...(removed.length > 0 ? [{ kind: 'delete' as const, ids: removed }] : []),
      ...[...added.filter((element) => !isLink(element)), ...added.filter(isLink)].map((element) => ({
        kind: 'create' as const,
        element,
      })),
      ...changed.map((element) => ({ kind: 'update' as const, id: element.id, path: [], value: element })),
    ],
  };
};
