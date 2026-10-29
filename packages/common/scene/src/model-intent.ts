//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
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
      readonly object: { readonly id: string; readonly kind: string };
    };

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
): Split<E> => {
  // A selected group brings its members; a selected link with an end left outside stays out, bound to the new element.
  const taken = new Set<string>();
  const take = (key: string) => {
    const element = elements[key];
    if (!element || taken.has(key)) {
      return;
    }
    taken.add(key);
    element.members?.forEach(take);
  };
  ids.forEach(take);
  const isBound = (element: E) => element.from !== undefined || element.to !== undefined;
  const endsInside = (element: E) =>
    (element.from === undefined || taken.has(element.from.element)) &&
    (element.to === undefined || taken.has(element.to.element));
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
    const rebind = (end: E['from']) => (end && taken.has(end.element) ? { ...end, element: id } : end);
    const members = element.members && [...new Set(element.members.map((member) => (taken.has(member) ? id : member)))];
    outside[key] = {
      ...element,
      ...(isBound(element) ? { from: rebind(element.from), to: rebind(element.to) } : {}),
      ...(members ? { members } : {}),
    };
  }
  const element = placing(Object.values(inside).filter((element) => element.kind !== 'link'));
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
    return problem(`An object of kind "${intent.object.kind}" does not fit a ${model.dim} model.`);
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
    case 'extract': {
      const layout = doc.layouts.find((record) => record.id === intent.layout);
      if (!layout || layout.dim !== model.dim) {
        return problem(`No ${model.dim} layout "${intent.layout}".`);
      }
      return extract(doc, model, layout, intent);
    }
  }
};
