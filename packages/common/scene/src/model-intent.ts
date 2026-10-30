//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ElementEndpoint, endpointNode, rebindEndpoint } from './element.ts';
import {
  type Arrangement,
  type Element2D,
  type Element3D,
  type LayoutRecord,
  type LayoutRecord2D,
  type LayoutRecord3D,
  type ModelRecord,
  Object2D,
  Object3D,
  type SceneDocument,
} from './Scene.ts';
import { type Problem } from './validate.ts';

/** One edit to a model's objects; `extract` also edits the layout its elements come from. */
export type ModelIntent =
  | { readonly kind: 'define'; readonly model: string; readonly object: Object2D | Object3D }
  | {
      readonly kind: 'update';
      readonly model: string;
      readonly id: string;
      readonly path: readonly string[];
      readonly value?: unknown;
    }
  | { readonly kind: 'remove'; readonly model: string; readonly id: string }
  | {
      readonly kind: 'extract';
      readonly model: string;
      readonly layout: string;
      readonly ids: readonly string[];
      readonly object: { readonly id: string; readonly type: string };
    }
  | {
      readonly kind: 'group';
      readonly model: string;
      readonly layout: string;
      readonly id: string;
      readonly members: readonly string[];
      readonly arrange?: Arrangement;
    }
  | { readonly kind: 'ungroup'; readonly model: string; readonly layout: string; readonly id: string };

export type ModelIntentResult = { doc: SceneDocument; problems: Problem[] };

const isObject2D = Schema.is(Object2D);
const isObject3D = Schema.is(Object3D);

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

/** The model with `object` set (by its id), when the object is of the model's dimension. */
const withObject = (model: ModelRecord, object: unknown): ModelRecord | undefined => {
  if (model.dim === '2d') {
    return isObject2D(object) ? { ...model, objects: { ...model.objects, [object.id]: object } } : undefined;
  }
  return isObject3D(object) ? { ...model, objects: { ...model.objects, [object.id]: object } } : undefined;
};

const withoutObject = (model: ModelRecord, id: string): ModelRecord => {
  if (model.dim === '2d') {
    const { [id]: _removed, ...objects } = model.objects;
    return { ...model, objects };
  }
  const { [id]: _removed, ...objects } = model.objects;
  return { ...model, objects };
};

const freeKey = (taken: (key: string) => boolean, base: string): string => {
  if (!taken(base)) {
    return base;
  }
  let index = 2;
  while (taken(`${base}-${index}`)) {
    index++;
  }
  return `${base}-${index}`;
};

type Split<E> = { inside: Record<string, E>; outside: Record<string, E>; element: E };

/** Moves `ids` (and the links among them) out of `elements`; links that crossed out end at `id` instead. */
const split = <E extends Element2D | Element3D>(
  elements: Readonly<Record<string, E>>,
  ids: ReadonlySet<string>,
  id: string,
  placing: (inside: readonly E[]) => E,
  rebindOut: (end: ElementEndpoint, taken: ReadonlySet<string>, id: string) => ElementEndpoint = (end, taken, id) =>
    rebindEndpoint(end, (node) => (taken.has(node) ? id : node)),
): Split<E> => {
  // A selected link with an end left outside stays out, bound to the new element.
  const taken = new Set([...ids].filter((key) => elements[key] !== undefined));
  const isBound = (element: E) => element.source !== undefined || element.target !== undefined;
  const endsInside = (element: E) =>
    (element.source === undefined || taken.has(endpointNode(element.source) ?? '')) &&
    (element.target === undefined || taken.has(endpointNode(element.target) ?? ''));
  const within = (element: E) => isBound(element) && endsInside(element);
  const moved = (key: string, element: E) =>
    (taken.has(key) && (!isBound(element) || endsInside(element))) || within(element);
  const inside: Record<string, E> = {};
  const outside: Record<string, E> = {};
  for (const [key, element] of Object.entries(elements)) {
    if (moved(key, element)) {
      inside[key] = element;
      continue;
    }
    const rebind = (end: ElementEndpoint | undefined) => end && rebindOut(end, taken, id);
    outside[key] = {
      ...element,
      ...(isBound(element) ? { source: rebind(element.source), target: rebind(element.target) } : {}),
    };
  }
  const element = placing(Object.values(inside).filter((element) => element.type !== 'link'));
  return { inside, outside: { ...outside, [id]: element }, element };
};

/** Turns the elements `ids` of a layout into one element placing a new composite object whose parts hold them. */
const extract = (
  doc: SceneDocument,
  model: ModelRecord,
  layout: LayoutRecord,
  intent: Extract<ModelIntent, { kind: 'extract' }>,
): ModelIntentResult => {
  const ids = new Set(intent.ids.filter((id) => layout.elements[id] !== undefined));
  const problem = (message: string): ModelIntentResult => ({
    doc,
    problems: [{ part: 'model', id: model.id, message }],
  });
  if (ids.size === 0) {
    return problem('Extract needs at least one element of the layout.');
  }
  if (model.objects[intent.object.id] !== undefined) {
    return problem(`The model already has an object "${intent.object.id}".`);
  }
  const partsId = freeKey((key) => doc.layouts.some((record) => record.id === key), `${intent.object.id}-parts`);
  const elementId = freeKey((key) => layout.elements[key] !== undefined, intent.object.id);
  const object = { ...intent.object, parts: partsId };
  const nextModel = withObject(model, object);
  if (!nextModel) {
    return problem(`An object of type "${intent.object.type}" does not fit a ${model.dim} model.`);
  }
  let parts: LayoutRecord;
  let host: LayoutRecord;
  if (layout.dim === '3d') {
    const result = split<Element3D>(layout.elements, ids, elementId, (inside) => {
      const centers = inside.flatMap((element) => (element.center ? [element.center] : []));
      const mean = (axis: 'x' | 'y' | 'z') =>
        round(centers.reduce((total, center) => total + center[axis], 0) / Math.max(1, centers.length));
      return { id: elementId, object: object.id, center: { x: mean('x'), y: mean('y'), z: mean('z') } };
    });
    parts = { id: partsId, dim: '3d', model: model.id, elements: result.inside } satisfies LayoutRecord3D;
    host = { ...layout, model: layout.model ?? model.id, elements: result.outside };
  } else {
    const result = split<Element2D>(layout.elements, ids, elementId, (inside) => {
      const boxes = inside.flatMap((element) =>
        element.center ? [{ center: element.center, size: element.size ?? { width: 0, height: 0 } }] : [],
      );
      const left = Math.min(...boxes.map(({ center, size }) => center.x - size.width / 2));
      const right = Math.max(...boxes.map(({ center, size }) => center.x + size.width / 2));
      const top = Math.min(...boxes.map(({ center, size }) => center.y - size.height / 2));
      const bottom = Math.max(...boxes.map(({ center, size }) => center.y + size.height / 2));
      return boxes.length === 0
        ? { id: elementId, object: object.id }
        : {
            id: elementId,
            object: object.id,
            center: { x: round((left + right) / 2), y: round((top + bottom) / 2) },
            size: { width: round(right - left), height: round(bottom - top) },
          };
    });
    parts = { id: partsId, dim: '2d', model: model.id, elements: result.inside } satisfies LayoutRecord2D;
    host = { ...layout, model: layout.model ?? model.id, elements: result.outside };
  }
  return {
    doc: {
      ...doc,
      layouts: [...doc.layouts.map((record) => (record.id === layout.id ? host : record)), parts],
      models: doc.models.map((record) => (record.id === model.id ? nextModel : record)),
    },
    problems: [],
  };
};

/** A link end at an element moved into a group ends at the group, on the port that names the element. */
const toPort = (end: ElementEndpoint, taken: ReadonlySet<string>, id: string): ElementEndpoint =>
  end.node !== undefined && taken.has(end.node) ? { node: id, port: end.node } : end;

/**
 * Groups elements of a layout into an anonymous composite (decision 17) that one new element places with no fit, so
 * they stay where they are; a link from outside ends at the group, on the port named by the element it bound.
 */
const group = (
  doc: SceneDocument,
  model: ModelRecord,
  layout: LayoutRecord,
  intent: Extract<ModelIntent, { kind: 'group' }>,
): ModelIntentResult => {
  const problem = (message: string): ModelIntentResult => ({
    doc,
    problems: [{ part: 'layout', id: layout.id, message }],
  });
  const ids = new Set(
    intent.members.filter((id) => layout.elements[id] !== undefined && layout.elements[id].type !== 'link'),
  );
  if (ids.size === 0) {
    return problem('A group needs at least one element of the layout.');
  }
  if (layout.elements[intent.id] !== undefined) {
    return problem(`The layout already has an element "${intent.id}".`);
  }
  const compositeId = freeKey(
    (key) => doc.layouts.some((record) => record.id === key) || model.objects[key] !== undefined,
    `${layout.id}/${intent.id}`,
  );
  const nextModel = withObject(model, { id: compositeId, type: 'group', parts: compositeId });
  if (!nextModel) {
    return problem(`A group does not fit a ${model.dim} model.`);
  }
  const composite = {
    id: compositeId,
    model: model.id,
    kind: 'composite' as const,
    anonymous: true,
    ...(intent.arrange ? { arrange: intent.arrange } : {}),
  };
  const instance = { id: intent.id, object: compositeId, fit: 'none' as const };
  let parts: LayoutRecord;
  let host: LayoutRecord;
  if (layout.dim === '3d') {
    const result = split<Element3D>(layout.elements, ids, intent.id, () => instance, toPort);
    parts = { ...composite, dim: '3d', elements: result.inside } satisfies LayoutRecord3D;
    host = { ...layout, model: layout.model ?? model.id, elements: result.outside };
  } else {
    const result = split<Element2D>(layout.elements, ids, intent.id, () => instance, toPort);
    parts = { ...composite, dim: '2d', elements: result.inside } satisfies LayoutRecord2D;
    host = { ...layout, model: layout.model ?? model.id, elements: result.outside };
  }
  return {
    doc: {
      ...doc,
      layouts: [...doc.layouts.map((record) => (record.id === layout.id ? host : record)), parts],
      models: doc.models.map((record) => (record.id === model.id ? nextModel : record)),
    },
    problems: [],
  };
};

/** An element moved out of a group placed at `center`: its position in the group's layout, offset by the group's. */
const shifted = <E extends Element2D | Element3D>(element: E, center: E['center']): E => {
  if (!center || !element.center) {
    return element;
  }
  const add = (axis: 'x' | 'y' | 'z') => round(Reflect.get(element.center ?? {}, axis) + Reflect.get(center, axis));
  return {
    ...element,
    center: 'z' in center ? { x: add('x'), y: add('y'), z: add('z') } : { x: add('x'), y: add('y') },
  };
};

/** Undoes `group`: the group's elements return to the layout where they are drawn, and links to its ports rebind. */
const ungroup = (
  doc: SceneDocument,
  model: ModelRecord,
  layout: LayoutRecord,
  intent: Extract<ModelIntent, { kind: 'ungroup' }>,
): ModelIntentResult => {
  const problem = (message: string): ModelIntentResult => ({
    doc,
    problems: [{ part: 'layout', id: layout.id, message }],
  });
  const element = layout.elements[intent.id];
  const object = element?.object === undefined ? undefined : model.objects[element.object];
  const parts = object?.parts === undefined ? undefined : doc.layouts.find((record) => record.id === object.parts);
  if (!element || !object || object.type !== 'group' || !parts || parts.dim !== layout.dim) {
    return problem(`"${intent.id}" is not a group.`);
  }
  const fromPort = (end: ElementEndpoint | undefined) =>
    end && end.node === intent.id && end.port !== undefined ? { node: end.port } : end;
  const rebound = <E extends Element2D | Element3D>(each: E): E =>
    each.source || each.target ? { ...each, source: fromPort(each.source), target: fromPort(each.target) } : each;
  const placedElsewhere = doc.layouts.some((record) =>
    Object.values(record.elements).some((other) => other.object === object.id && other !== element),
  );
  const merged = <E extends Element2D | Element3D>(
    own: Readonly<Record<string, E>>,
    inner: Readonly<Record<string, E>>,
    center: E['center'],
  ): Record<string, E> =>
    Object.fromEntries([
      ...Object.entries(own)
        .filter(([key]) => key !== intent.id)
        .map(([key, each]): [string, E] => [key, rebound(each)]),
      ...Object.entries(inner).map(([key, each]): [string, E] => [key, shifted(each, center)]),
    ]);
  const host: LayoutRecord =
    layout.dim === '3d' && parts.dim === '3d'
      ? { ...layout, elements: merged(layout.elements, parts.elements, layout.elements[intent.id]?.center) }
      : layout.dim === '2d' && parts.dim === '2d'
        ? { ...layout, elements: merged(layout.elements, parts.elements, layout.elements[intent.id]?.center) }
        : layout;
  return {
    doc: {
      ...doc,
      layouts: doc.layouts
        .filter((record) => placedElsewhere || record.id !== parts.id)
        .map((record) => (record.id === layout.id ? host : record)),
      models: doc.models.map((record) =>
        record.id === model.id && !placedElsewhere ? withoutObject(model, object.id) : record,
      ),
    },
    problems: [],
  };
};

/**
 * The document with `intent` applied to a model, and the problems that stopped it: on any problem the document is
 * returned unchanged. Removing an object an element still places is refused, so no element is left placing nothing.
 */
export const applyModelIntent = (doc: SceneDocument, intent: ModelIntent): ModelIntentResult => {
  const model = doc.models.find((record) => record.id === intent.model);
  if (!model) {
    return { doc, problems: [{ part: 'model', id: intent.model, message: `No model "${intent.model}".` }] };
  }
  const problem = (message: string): ModelIntentResult => ({
    doc,
    problems: [{ part: 'model', id: model.id, message }],
  });
  const replace = (next: ModelRecord): ModelIntentResult => ({
    doc: { ...doc, models: doc.models.map((record) => (record.id === model.id ? next : record)) },
    problems: [],
  });
  switch (intent.kind) {
    case 'define': {
      if (model.objects[intent.object.id] !== undefined) {
        return problem(`The model already has an object "${intent.object.id}".`);
      }
      const next = withObject(model, intent.object);
      return next ? replace(next) : problem(`"${intent.object.id}" is not an object of a ${model.dim} model.`);
    }
    case 'update': {
      const current = model.objects[intent.id];
      if (!current) {
        return problem(`No object "${intent.id}" in the model.`);
      }
      const next = withObject(model, setPath(current, intent.path, intent.value));
      return next ? replace(next) : problem(`The update leaves "${intent.id}" no longer an object.`);
    }
    case 'remove': {
      if (!model.objects[intent.id]) {
        return problem(`No object "${intent.id}" in the model.`);
      }
      const placing = doc.layouts.flatMap((layout) =>
        layout.model === model.id
          ? Object.values(layout.elements).flatMap((element) => (element.object === intent.id ? [element.id] : []))
          : [],
      );
      return placing.length > 0
        ? problem(`"${intent.id}" is still placed by ${placing.join(', ')}.`)
        : replace(withoutObject(model, intent.id));
    }
    case 'extract':
    case 'group':
    case 'ungroup': {
      const layout = doc.layouts.find((record) => record.id === intent.layout);
      if (!layout || layout.dim !== model.dim) {
        return problem(`No ${model.dim} layout "${intent.layout}".`);
      }
      return intent.kind === 'extract'
        ? extract(doc, model, layout, intent)
        : intent.kind === 'group'
          ? group(doc, model, layout, intent)
          : ungroup(doc, model, layout, intent);
    }
  }
};
