//
// Copyright 2026 DXOS.org
//

import { type ViewMap, type ViewportProps } from '@dxos/react-ui-canvas';
import { fromRenderList2D } from '@dxos/react-ui-canvas/headless';
import { type LayoutIntent, type Scene, findLayout, layoutChanges } from '@dxos/scene';

/**
 * One write a 2D engine change makes: an intent on a layout (`created` when the engine opened a View the document has
 * no layout for yet, such as a new portal's scene), or an object a new composite places, defined in the root's model.
 */
export type ViewWrite =
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
 * The element a changed node or link writes over the stored one: the canvas's fields from the View, the props other
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
 * What a change to the 2D engine's Views writes to the document: per View that changed, one intent on its layout with
 * only the elements that changed (so a drag of any number of elements is one write), and the model objects a new portal
 * or instance places. New layouts come first, then their objects, then the layouts placing them, so every reference
 * resolves when it is written.
 */
export const viewWrites = (document: Scene.SceneDocument, previous: ViewMap, next: ViewMap): ViewWrite[] => {
  const models = new Map(document.models.flatMap((model) => (model.dim === '2d' ? [[model.id, model] as const] : [])));
  const known = new Set(document.models.flatMap((model) => (model.dim === '2d' ? Object.keys(model.objects) : [])));
  const created: ViewWrite[] = [];
  const defines = new Map<string, ViewWrite>();
  const updated: ViewWrite[] = [];
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

export type ApplyViewWritesOptions = Pick<ViewportProps, 'onIntent' | 'onModelIntent' | 'onTransaction'> & {
  /** The root's model, which a new composite's object is defined in. */
  model: string | undefined;
};

/**
 * Sends one engine change's writes to the editor; a change that writes more than once (a new portal: its element, its
 * scene and its object) goes as one transaction, so it undoes in one step, while a single write stays field-level.
 */
export const applyViewWrites = (
  writes: readonly ViewWrite[],
  { model, onIntent, onModelIntent, onTransaction }: ApplyViewWritesOptions,
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
