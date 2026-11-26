//
// Copyright 2026 DXOS.org
//

import { type Style2D } from './element.ts';
import {
  type Element2D,
  type Element3D,
  type LayoutRecord,
  type LayoutRecord2D,
  type LayoutRecord3D,
  type ModelRecord,
  type Object2D,
  type Object3D,
  type SceneDocument,
  type SceneRecord,
} from './Scene.ts';
import { type Style3D, resolveStyle } from './style.ts';

/**
 * An element with its model object applied, which is what renderers draw and the animator keys: its `type` is known,
 * and `overrides` hold its whole resolved look (the named style through the layout and model, then the object's and
 * its own overrides).
 */
export type Resolved2D = Element2D & { kind: string; parts?: string };
export type Resolved3D = Element3D & { kind: string; parts?: string };
export type Resolved = Resolved2D | Resolved3D;

/** A document with no scenes, layouts or models. */
export const EMPTY_DOCUMENT: SceneDocument = { scenes: [], layouts: [], models: [] };

/** The scene a document opens at. */
export const rootScene = (doc: SceneDocument): SceneRecord | undefined => doc.scenes[0];

export const findScene = (doc: SceneDocument, id: string): SceneRecord | undefined =>
  doc.scenes.find((scene) => scene.id === id);

export const findLayout = (doc: SceneDocument, id: string): LayoutRecord | undefined =>
  doc.layouts.find((layout) => layout.id === id);

export const findModel = (doc: SceneDocument, id: string): ModelRecord | undefined =>
  doc.models.find((model) => model.id === id);

/** The layout a scene views, when it exists and has the scene's dimension; the root scene's by default. */
export const sceneLayout = (doc: SceneDocument, scene = rootScene(doc)): LayoutRecord | undefined => {
  const layout = scene && findLayout(doc, scene.layout);
  return layout?.dim === scene?.dim ? layout : undefined;
};

type Styles<S> = {
  readonly layout?: { readonly [id: string]: Partial<S> | undefined };
  readonly model?: { readonly [id: string]: S | undefined };
};

/** The element's look: its named style (or the object's) through the layout and model, then the overrides. */
const look = <S extends object>(
  element: { readonly style?: string; readonly overrides?: Partial<S> },
  object: { readonly style?: string; readonly overrides?: Partial<S> } | undefined,
  styles: Styles<S>,
): { overrides?: Partial<S> } => {
  const style = element.style ?? object?.style;
  const overrides = { ...object?.overrides, ...element.overrides };
  const resolved = resolveStyle<S>(
    { style, overrides },
    { styles: styles.layout },
    { styles: styles.model ?? {} },
    [],
    {},
  );
  return Object.keys(resolved).length > 0 ? { overrides: resolved } : {};
};

const mergeProps = (
  base: Record<string, unknown> | undefined,
  own: Record<string, unknown> | undefined,
): { props?: Record<string, unknown> } => (base || own ? { props: { ...base, ...own } } : {});

const modelOf = (doc: SceneDocument, layout: LayoutRecord): ModelRecord | undefined =>
  layout.model === undefined ? undefined : findModel(doc, layout.model);

// The dimension check keeps a layout from reading the other dimension's objects as its own.
const objects2D = (doc: SceneDocument, layout: LayoutRecord2D): Readonly<Record<string, Object2D>> => {
  const model = modelOf(doc, layout);
  return model?.dim === '2d' ? model.objects : {};
};

const objects3D = (doc: SceneDocument, layout: LayoutRecord3D): Readonly<Record<string, Object3D>> => {
  const model = modelOf(doc, layout);
  return model?.dim === '3d' ? model.objects : {};
};

/** The kinds a model object takes to say which container it is; any other object with parts is an Object. */
export const CONTAINER_KINDS = ['group', 'hull', 'view'] as const;
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

/** What an element placing an object with parts is: a group, a hull, a View, or a reusable Object. */
export type Container = ContainerKind | 'object';

/** Whether an object's kind names a container, and so is not a kind it draws as. */
export const isContainerKind = (kind: string): kind is ContainerKind => CONTAINER_KINDS.some((known) => known === kind);

/**
 * Which container the element `id` of a layout is, by the object `model` holds for it; nothing where it places no
 * object with parts. The object's kind says it. A drawing stored before it did says it on the element (a `view`, a
 * `hull`) and on the parts layout (`anonymous`, as Group made it), which is read here and nowhere else.
 */
export const containerIn = (
  doc: SceneDocument,
  model: ModelRecord | undefined,
  layout: LayoutRecord,
  id: string,
): Container | undefined => {
  const element = layout.elements[id];
  const object = element?.object === undefined ? undefined : model?.objects[element.object];
  if (!element || object?.parts === undefined) {
    return undefined;
  }
  if (isContainerKind(object.kind)) {
    return object.kind;
  }
  if (element.kind === 'view') {
    return 'view';
  }
  if (Reflect.get(element, 'hull') !== undefined) {
    return 'hull';
  }
  return findLayout(doc, object.parts)?.anonymous ? 'group' : 'object';
};

/** {@link containerIn} the layout's own model. */
export const containerOf = (doc: SceneDocument, layout: LayoutRecord, id: string): Container | undefined =>
  containerIn(doc, modelOf(doc, layout), layout, id);

/** Whether the container keeps its members in the parent's coordinates, which Ungroup puts back. */
export const isGrouping = (container: Container | undefined): boolean => container === 'group' || container === 'hull';

/** A 2D element with the object it places applied: the element's own fields win, style and props merge. */
export const resolve2D = (
  element: Element2D,
  object: Object2D | undefined,
  styles: Styles<Style2D> = {},
): Resolved2D => {
  const size = element.size ?? object?.size;
  return {
    ...element,
    kind: element.kind ?? object?.kind ?? '',
    ...(size ? { size } : {}),
    ...look(element, object, styles),
    ...mergeProps(object?.props, element.props),
    ...(object?.parts !== undefined ? { parts: object.parts } : {}),
  };
};

/** A 3D element with the object it places applied, as {@link resolve2D}. */
export const resolve3D = (
  element: Element3D,
  object: Object3D | undefined,
  styles: Styles<Style3D> = {},
): Resolved3D => {
  const scale = element.scale ?? object?.scale;
  return {
    ...element,
    kind: element.kind ?? object?.kind ?? '',
    ...(scale ? { scale } : {}),
    ...look(element, object, styles),
    ...mergeProps(object?.props, element.props),
    ...(object?.parts !== undefined ? { parts: object.parts } : {}),
  };
};

/** Every element of a 2D layout, resolved against the layout's model. */
export const resolveLayout2D = (doc: SceneDocument, layout: LayoutRecord2D): Record<string, Resolved2D> => {
  const objects = objects2D(doc, layout);
  const model = modelOf(doc, layout);
  const styles = { layout: layout.styles, model: model?.dim === '2d' ? model.styles : undefined };
  return Object.fromEntries(
    Object.entries(layout.elements).map(([key, element]) => [
      key,
      resolve2D(element, element.object === undefined ? undefined : objects[element.object], styles),
    ]),
  );
};

/** Every element of a 3D layout, resolved against the layout's model. */
export const resolveLayout3D = (doc: SceneDocument, layout: LayoutRecord3D): Record<string, Resolved3D> => {
  const objects = objects3D(doc, layout);
  const model = modelOf(doc, layout);
  const styles = { layout: layout.styles, model: model?.dim === '3d' ? model.styles : undefined };
  return Object.fromEntries(
    Object.entries(layout.elements).map(([key, element]) => [
      key,
      resolve3D(element, element.object === undefined ? undefined : objects[element.object], styles),
    ]),
  );
};

/** Every element of a layout, resolved; the parts layout a composite element shows is named by `parts`. */
export const resolveLayout = (doc: SceneDocument, layout: LayoutRecord): Record<string, Resolved> =>
  layout.dim === '2d' ? resolveLayout2D(doc, layout) : resolveLayout3D(doc, layout);
