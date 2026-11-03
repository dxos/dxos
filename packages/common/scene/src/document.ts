//
// Copyright 2026 DXOS.org
//

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
import { type Style2D, type Style3D, resolveStyle } from './style.ts';

/**
 * An element with its model object applied, which is what renderers draw and the animator keys: its `type` is known,
 * and `overrides` hold its whole resolved look (the named style through the layout and model, then the object's and
 * its own overrides).
 */
export type Resolved2D = Element2D & { type: string; parts?: string };
export type Resolved3D = Element3D & { type: string; parts?: string };
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

/** A 2D element with the object it places applied: the element's own fields win, style and props merge. */
export const resolve2D = (
  element: Element2D,
  object: Object2D | undefined,
  styles: Styles<Style2D> = {},
): Resolved2D => {
  const size = element.size ?? object?.size;
  return {
    ...element,
    type: element.type ?? object?.type ?? '',
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
    type: element.type ?? object?.type ?? '',
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
