//
// Copyright 2026 DXOS.org
//

import {
  type LayoutIntent,
  type ModelIntent,
  Scene,
  type ViewId,
  applyIntent,
  findLayout,
  isContainerKind,
  layoutChanges,
} from '@dxos/scene';

import {
  type ConstrainContext,
  type ConstrainIntent,
  type RenderList2D,
  type RenderLists2D,
  type ViewportProps,
} from '../model/index.ts';
import {
  type LatticeSpec,
  type SceneEdit,
  type ViewMove,
  collapseHulls,
  expandHulls,
  fitHulls,
  gridPitch,
  moveToHull,
  reseat,
} from '../utils/index.ts';
import { type WriteContext, fromRenderList2D, objectPlacing, toRenderList2D, toRenderLists2D } from './render-list.ts';

/**
 * One write a 2D engine change makes: an intent on a layout (`created` when the engine opened a layout the document has
 * none for yet, such as a new portal's scene), an object a new composite places, defined in the root's model, or the
 * kind of an object that is now another container (`retype`).
 */
export type LayoutWrite =
  | { kind: 'layout'; layout: string; intent: LayoutIntent; created: boolean }
  | { kind: 'define'; object: Scene.Object2D }
  | { kind: 'retype'; object: string; value: string };

/** The intent a write to the model makes on `model`. */
export const modelIntentOf = (write: Exclude<LayoutWrite, { kind: 'layout' }>, model: string): ModelIntent =>
  write.kind === 'define'
    ? { kind: 'define', model, object: write.object }
    : { kind: 'update', model, id: write.object, path: ['kind'], value: write.value };

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
 * The element a changed node or link writes over the stored one: the node or link itself, the props other writers own
 * and the DSL identity from the stored element, and an object placement kept while the node is still that object's
 * kind. A field those props hold is theirs alone, so the node's copy of it is not stored beside it.
 */
const mergeElement = (
  current: Element | undefined,
  written: Element,
  objectOf: (id: string) => Scene.Object2D | undefined,
): Element => {
  const kept = current?.props ?? {};
  const own = clone(written);
  for (const key of Object.keys(kept)) {
    // A prop that shares a name with a field every element has is not that field.
    !Object.hasOwn(Scene.Element2D.fields, key) && Reflect.deleteProperty(own, key);
  }
  const { kind, ...element } = { ...own, ...(Object.keys(kept).length > 0 ? { props: kept } : {}) };
  const dsl = element.dsl ?? current?.dsl;
  const placed = current?.object;
  const object = placed === undefined ? undefined : objectOf(placed);
  const value: Element =
    placed !== undefined && object && element.object === undefined && kind === object.kind
      ? overObject({ ...element, object: placed }, object)
      : { ...element, ...(kind === undefined ? {} : { kind }) };
  return dsl === undefined ? value : { ...value, dsl };
};

/** The objects of a document's 2D models, by id. */
const objects2D = (document: Scene.SceneDocument): Record<string, Scene.Object2D> =>
  Object.assign({}, ...document.models.map((model) => (model.dim === '2d' ? model.objects : {})));

/**
 * What a list is written against: the objects the document holds, so an element keeps the object it places and one
 * layout has one object, and the lists beside it, which say whether a composite is a group's.
 */
const writeContext = (
  document: Scene.SceneDocument,
  layout: Scene.LayoutRecord2D | undefined,
  lists: RenderLists2D,
): WriteContext => {
  const objects = objects2D(document);
  return {
    objectFor: (parts, element) =>
      objectPlacing(objects, (object) => object.parts, parts, layout?.elements[element]?.object),
    anonymous: (parts) => (lists[parts] ?? findLayout(document, parts))?.anonymous === true,
  };
};

/** Whether a stored object's kind has to follow what its node now is: a container's kind is what readers go by. */
const kindChanged = (stored: Scene.Object2D, written: Scene.Object2D): boolean =>
  stored.kind !== written.kind && [stored.kind, written.kind].some((kind) => isContainerKind(kind));

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
  const known = objects2D(document);
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
    const context = writeContext(document, layout, next);
    const { layout: record, objects } = fromRenderList2D(view, context);
    const shown = before ? fromRenderList2D(before, context).layout.elements : undefined;
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
      const stored = known[object.id];
      if (defines.has(object.id)) {
        continue;
      }
      if (stored === undefined) {
        defines.set(object.id, { kind: 'define', object });
      } else if (kindChanged(stored, object)) {
        // A group that was named is an Object from then on, and an object stored before its kind said what it is
        // says so once its node is written.
        defines.set(object.id, { kind: 'retype', object: object.id, value: object.kind });
      }
    }
    const intent = layoutChanges(current, after);
    if (!layout) {
      // The host creates the layout bare, so what it is (a composite, its name) is written with its elements.
      const { kind, name, anonymous } = record;
      const patch = { ...(kind && { kind }), ...(name !== undefined && { name }), ...(anonymous && { anonymous }) };
      created.push({
        kind: 'layout',
        layout: view.id,
        intent:
          Object.keys(patch).length > 0 ? { kind: 'batch', intents: [intent, { kind: 'layout', patch }] } : intent,
        created: true,
      });
    } else if (!isEmpty(intent)) {
      updated.push({ kind: 'layout', layout: view.id, intent, created: false });
    }
  }
  return [...created, ...defines.values(), ...updated];
};

/** A document's 2D layouts as the engine draws them, and which of them hold a hull's group opened out. */
export type DrawnLists2D = { lists: RenderList2D[]; root: ViewId; opened: ReadonlySet<ViewId> };

/**
 * A document's 2D layouts as the lists the engine draws (`toRenderLists2D`), with every hull's group opened out in
 * the scene that places it: what the 2D editor shows and edits, in place of the group as it is stored.
 */
export const drawnLists2D = (document: Scene.SceneDocument, scene?: Scene.SceneRecord): DrawnLists2D => {
  const { lists, root } = scene === undefined ? toRenderLists2D(document) : toRenderLists2D(document, scene);
  const stored: RenderLists2D = Object.fromEntries(lists.map((list) => [list.id, list]));
  const opened = expandHulls(stored);
  // Fitted as it is read, on the layout's own lattice, so the frame the editor selects by is the border it draws.
  const fitted = (list: RenderList2D): RenderList2D => {
    const layout = findLayout(document, list.id);
    return layout?.dim === '2d' ? fitHulls(list, layout.lattice, gridPitch(layout)) : fitHulls(list);
  };
  const drawn: RenderLists2D =
    opened === stored
      ? stored
      : Object.fromEntries(
          Object.values(opened).map((list) => [list.id, stored[list.id] === list ? list : fitted(list)]),
        );
  return {
    lists: lists.flatMap((list) => drawn[list.id] ?? []),
    root,
    opened: new Set(
      lists.flatMap((list) => (drawn[list.id] !== undefined && drawn[list.id] !== list ? [list.id] : [])),
    ),
  };
};

/**
 * What a change to the lists the engine draws writes to the document ({@link layoutWrites}), each hull closed into
 * its group first, so what is stored is the group and never the scene it was opened out in.
 */
export const drawnWrites = (
  document: Scene.SceneDocument,
  previous: RenderLists2D,
  next: RenderLists2D,
): LayoutWrite[] => layoutWrites(document, collapseHulls(previous), collapseHulls(next));

/**
 * What moving an element into, out of or between hulls writes to the document: the move is made in the scene as the
 * engine draws it, so the links on the element, and the frames of the hulls it leaves and joins, follow as they do
 * for a move on the canvas. Nothing when the move is not one the scene allows.
 */
export const moveWrites = (document: Scene.SceneDocument, move: ViewMove, scene?: Scene.SceneRecord): LayoutWrite[] => {
  const { lists } = drawnLists2D(document, scene);
  const drawn: RenderLists2D = Object.fromEntries(lists.map((list) => [list.id, list]));
  const shown = drawn[move.scene];
  const moved =
    shown &&
    moveToHull(
      shown,
      move.element,
      move.group,
      move.target !== undefined && move.position ? { target: move.target, position: move.position } : undefined,
    );
  return moved ? drawnWrites(document, drawn, { ...drawn, [move.scene]: moved }) : [];
};

/**
 * What a change of `layout`'s lattice to `lattice` writes besides the lattice itself: every shape drawn on it keeps
 * its cells ({@link reseat}). The layout's mode places its own shapes with the lattice, but a hull's shapes are
 * stored in the hull's group, about the group's centre, so they are placed here, in the scene as the engine draws it.
 * Nothing when the layout has no lattice yet, since its shapes are then on no cells to keep.
 */
export const reseatWrites = (
  document: Scene.SceneDocument,
  layout: ViewId,
  lattice: LatticeSpec,
  scene?: Scene.SceneRecord,
): LayoutWrite[] => {
  const stored = findLayout(document, layout);
  const from = stored?.dim === '2d' ? stored.lattice : undefined;
  const { lists } = drawnLists2D(document, scene);
  const drawn: RenderLists2D = Object.fromEntries(lists.map((list) => [list.id, list]));
  const shown = drawn[layout];
  return from && shown ? drawnWrites(document, drawn, { ...drawn, [layout]: reseat(shown, from, lattice) }) : [];
};

/**
 * The document with each layout of `opened` holding what the engine draws of it, a hull's nodes among its own: what a
 * layout's mode is asked about, since it places every node of the scene, the ones inside a hull included. The
 * document itself when no hull is opened out.
 */
export const drawnDocument = (
  document: Scene.SceneDocument,
  lists: RenderLists2D,
  opened: ReadonlySet<ViewId>,
): Scene.SceneDocument =>
  opened.size === 0
    ? document
    : {
        ...document,
        layouts: document.layouts.map((layout) => {
          const list = layout.dim === '2d' && opened.has(layout.id) ? lists[layout.id] : undefined;
          return list && layout.dim === '2d'
            ? { ...layout, elements: fromRenderList2D(list, writeContext(document, layout, lists)).layout.elements }
            : layout;
        }),
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
        onModelIntent?.(modelIntentOf(next, model));
      }
    }
  };
  writes.length > 1 && onTransaction ? onTransaction(apply) : apply();
};
