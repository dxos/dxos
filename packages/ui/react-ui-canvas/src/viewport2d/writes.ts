//
// Copyright 2026 DXOS.org
//

import { type LayoutIntent, type Scene, type ViewId, applyIntent, findLayout, layoutChanges } from '@dxos/scene';

import { type ConstrainContext, type ConstrainIntent, type RenderLists2D, type ViewportProps } from '../model/index.ts';
import { type SceneEdit } from '../utils/index.ts';
import { fromRenderList2D, toRenderList2D } from './render-list.ts';

/**
 * One write a 2D engine change makes: an intent on a layout (`created` when the engine opened a layout the document has
 * none for yet, such as a new portal's scene), or an object a new composite places, defined in the root's model.
 */
export type LayoutWrite =
  | { kind: 'layout'; layout: string; intent: LayoutIntent; created: boolean }
  | { kind: 'define'; object: Scene.Object2D };

type Element = Scene.Element2D;

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** An element placing `object`, without the size and style it would read from the object anyway. */
const overObject = (element: Element, object: Scene.Object2D): Element => {
  const { size, overrides, ...rest } = element;
  const own = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([key, value]) => !same(value, Reflect.get(object.overrides ?? {}, key))),
  );
  return {
    ...rest,
    ...(size && !same(size, object.size) ? { size } : {}),
    ...(Object.keys(own).length > 0 ? { overrides: own } : {}),
  };
};

/**
 * The element a changed node or link writes over the stored one: the canvas's fields from the RenderList2D, the props other
 * writers own and the DSL identity from the stored element, and an object placement kept while the node is still that
 * object's kind.
 */
const mergeElement = (
  current: Element | undefined,
  written: Element,
  objectOf: (id: string) => Scene.Object2D | undefined,
): Element => {
  const { canvas: _canvas, ...kept } = current?.props ?? {};
  const { type, ...element } = { ...clone(written), props: { ...kept, ...written.props } };
  const dsl = element.dsl ?? current?.dsl;
  const placed = current?.object;
  const object = placed === undefined ? undefined : objectOf(placed);
  const value: Element =
    placed !== undefined && object && element.object === undefined && type === object.type
      ? overObject({ ...element, object: placed }, object)
      : { ...element, ...(type === undefined ? {} : { type }) };
  return dsl === undefined ? value : { ...value, dsl };
};

const isEmpty = (intent: LayoutIntent): boolean => intent.kind === 'batch' && intent.intents.every(isEmpty);

/**
 * What a change to the 2D engine's render lists writes to the document: per list that changed, one intent on its layout
 * with only the elements that changed (so a drag of any number of elements is one write), and the model objects a new
 * portal or instance places. New layouts come first, then their objects, then the layouts placing them, so every reference
 * resolves when it is written.
 */
export const layoutWrites = (
  document: Scene.SceneDocument,
  previous: RenderLists2D,
  next: RenderLists2D,
): LayoutWrite[] => {
  const models = new Map(document.models.flatMap((model) => (model.dim === '2d' ? [[model.id, model] as const] : [])));
  const known = new Set(document.models.flatMap((model) => (model.dim === '2d' ? Object.keys(model.objects) : [])));
  const created: LayoutWrite[] = [];
  const defines = new Map<string, LayoutWrite>();
  const updated: LayoutWrite[] = [];
  for (const view of Object.values(next)) {
    const before = previous[view.id];
    if (before === view) {
      continue;
    }
    const stored = findLayout(document, view.id);
    const layout = stored?.dim === '2d' ? stored : undefined;
    const { layout: record, objects } = fromRenderList2D(view);
    const shown = before ? fromRenderList2D(before).layout.elements : undefined;
    const current: Record<string, Element> = { ...layout?.elements };
    const model = layout?.model === undefined ? undefined : models.get(layout.model);
    const objectOf = (id: string) => model?.objects[id];
    const after: Record<string, Element> = { ...current };
    for (const [id, element] of Object.entries(record.elements)) {
      if (!shown || !same(shown[id], element)) {
        after[id] = mergeElement(current[id], element, objectOf);
      }
    }
    for (const id of Object.keys(shown ?? {})) {
      record.elements[id] === undefined && delete after[id];
    }
    for (const object of objects) {
      !known.has(object.id) && !defines.has(object.id) && defines.set(object.id, { kind: 'define', object });
    }
    const intent = layoutChanges(current, after);
    if (!layout) {
      created.push({ kind: 'layout', layout: view.id, intent, created: true });
    } else if (!isEmpty(intent)) {
      updated.push({ kind: 'layout', layout: view.id, intent, created: false });
    }
  }
  return [...created, ...defines.values(), ...updated];
};

/**
 * What the layout's `mode` would store of `edit` to list `sceneId`: the edit as given when the mode leaves it be, the
 * list as the mode rewrites it, or undefined when the mode refuses it. A list with no stored layout is left be.
 */
export const constrainEdit = (
  document: Scene.SceneDocument,
  lists: RenderLists2D,
  sceneId: ViewId,
  edit: SceneEdit,
  mode: ConstrainIntent,
  context: ConstrainContext,
): SceneEdit | undefined => {
  const shown = lists[sceneId];
  const record = findLayout(document, sceneId);
  if (!shown || record?.dim !== '2d') {
    return edit;
  }
  const write = layoutWrites(document, lists, { ...lists, [sceneId]: edit(shown) }).find(
    (next) => next.kind === 'layout' && next.layout === sceneId,
  );
  if (write?.kind !== 'layout') {
    return edit;
  }
  const constrained = mode(record, write.intent, context);
  if (constrained === undefined || constrained === write.intent) {
    return constrained && edit;
  }
  const layout = applyIntent(record, constrained);
  const drawn = toRenderList2D(
    { ...document, layouts: document.layouts.map((next) => (next.id === sceneId ? layout : next)) },
    layout,
  );
  return () => drawn;
};

export type ApplyLayoutWritesOptions = Pick<ViewportProps, 'onIntent' | 'onModelIntent' | 'onTransaction'> & {
  /** The root's model, which a new composite's object is defined in. */
  model: string | undefined;
};

/**
 * Sends one engine change's writes to the editor; a change that writes more than once (a new portal: its element, its
 * scene and its object) goes as one transaction, so it undoes in one step, while a single write stays field-level.
 */
export const applyLayoutWrites = (
  writes: readonly LayoutWrite[],
  { model, onIntent, onModelIntent, onTransaction }: ApplyLayoutWritesOptions,
): void => {
  const apply = () => {
    for (const next of writes) {
      if (next.kind === 'layout') {
        onIntent(next.layout, next.intent);
      } else if (model !== undefined) {
        onModelIntent?.({ kind: 'define', model, object: next.object });
      }
    }
  };
  writes.length > 1 && onTransaction ? onTransaction(apply) : apply();
};
