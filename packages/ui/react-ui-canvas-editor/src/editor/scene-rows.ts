//
// Copyright 2026 DXOS.org
//

import { type ViewPlace, type ViewTreeItem, between } from '@dxos/react-ui-canvas';
import {
  type ElementEndpoint,
  type Layer,
  type LayoutIntent,
  type ModelIntent,
  type Scene,
  findLayout,
  resolveLayout,
  rootScene,
  sceneLayout,
} from '@dxos/scene';

import { type ObjectEntry } from '../components/index.ts';

// The shared inspectors (Views, Objects, Layers) read their rows from a scene document of either dimension.

type LayoutLike = Pick<Scene.LayoutRecord, 'elements' | 'layers'>;

/** Bottom first by fractional `z`; an element with none draws first. */
const byZ = (left: { z?: string }, right: { z?: string }) =>
  (left.z ?? '') < (right.z ?? '') ? -1 : (left.z ?? '') > (right.z ?? '') ? 1 : 0;

/** The layers a layout keeps, bottom first. */
export const layersOf = (layout: LayoutLike): Layer[] =>
  Object.values(layout.layers ?? {}).sort((left, right) => (left.z < right.z ? -1 : left.z > right.z ? 1 : 0));

/** The elements on a hidden layer, which are neither drawn nor picked. */
export const hiddenElements = (layout: LayoutLike): ReadonlySet<string> => {
  const hidden = new Set(
    layersOf(layout)
      .filter((layer) => layer.hidden)
      .map((layer) => layer.id),
  );
  return new Set(
    Object.values(layout.elements)
      .filter((element) => element.layer !== undefined && hidden.has(element.layer))
      .map((element) => element.id),
  );
};

/** Every model object, with how many elements across the document place it. */
export const objectEntries = (doc: Scene.SceneDocument): ObjectEntry[] => {
  const counts = new Map<string, number>();
  for (const layout of doc.layouts) {
    for (const element of Object.values(layout.elements)) {
      if (element.object !== undefined) {
        counts.set(element.object, (counts.get(element.object) ?? 0) + 1);
      }
    }
  }
  return doc.models.flatMap((model) =>
    Object.values(model.objects).map((object) => ({
      id: object.id,
      name: object.id,
      instances: counts.get(object.id) ?? 0,
    })),
  );
};

/** Whether an element is a hull: the border as drawn with nothing inside it, or a group's Instance that draws one. */
const isHull = (element: Scene.Element): boolean => {
  const canvas: unknown = element.props?.canvas;
  return (
    element.type === 'hull' ||
    (typeof canvas === 'object' && canvas !== null && Reflect.get(canvas, 'hull') !== undefined)
  );
};

/** A selected element as its layout resolves it, and the layout that stores it. */
export type SelectedElement = { element: ReturnType<typeof resolveLayout>[string]; layout: string };

/**
 * The element `id` selected in `layout`, and the layout it is stored in: `layout` itself, or the parts of something it
 * places. A hull's shapes are drawn and selected in the scene but stored with its group, and so is a part of an Object
 * edited in place, which is stored in the Object's definition. A hull is looked in first: its shapes' ids are the
 * scene's own, where two Objects may each have a part of one name.
 */
export const selectedElement = (
  doc: Scene.SceneDocument,
  layout: Scene.LayoutRecord,
  id: string,
): SelectedElement | undefined => {
  const resolved = resolveLayout(doc, layout);
  if (layout.elements[id]) {
    return resolved[id] && { element: resolved[id], layout: layout.id };
  }
  const holders = Object.values(layout.elements);
  for (const holder of [...holders.filter(isHull), ...holders.filter((element) => !isHull(element))]) {
    const parts = resolved[holder.id]?.parts;
    const group = parts === undefined ? undefined : findLayout(doc, parts);
    const element = group?.elements[id] && resolveLayout(doc, group)[id];
    if (group && element) {
      return { element, layout: group.id };
    }
  }
  return undefined;
};

/** The hull a row's element is inside, and the scene that hull is drawn in. */
type Held = { scene: string; group: string };

/**
 * The views tree over a document's scene, as the 2D tree has always read (VIEWS.md §4): its layout as the root row; an
 * element whose parts are a View is that View's row, with the View's path and its contents as children; an element
 * placing a composite shows the composite's parts read-only, each selected inside the composite opened on its own.
 * A hull is the exception among composites: its shapes are drawn and edited in the scene that places it, so their
 * rows are not read-only and select where they stand.
 */
export const layoutTree = (doc: Scene.SceneDocument, scene = rootScene(doc)): ViewTreeItem => {
  const root = sceneLayout(doc, scene);
  const rowsOf = (
    layout: Scene.LayoutRecord,
    path: string[],
    prefix: string,
    object: ViewPlace | undefined,
    seen: Set<string>,
    held?: Held,
  ): ViewTreeItem[] => {
    const resolved = resolveLayout(doc, layout);
    const inObject = object ? { readonly: true, object } : {};
    // Rows list in drawing order, so a drag among them restacks as it looks.
    return Object.values(layout.elements)
      .sort(byZ)
      .map((element): ViewTreeItem => {
        const item = resolved[element.id];
        const parts = item?.parts === undefined || seen.has(item.parts) ? undefined : findLayout(doc, item.parts);
        const id = `${prefix}${element.id}`;
        const row = {
          id,
          element: element.id,
          container: layout.id,
          label: element.label ?? element.id,
          type: item?.type,
          ...inObject,
          ...held,
          ...(isHull(element) ? { hull: true } : {}),
        };
        const inside = parts && new Set([...seen, parts.id]);
        if (parts && inside && parts.kind !== 'composite') {
          const view = [...path, parts.id];
          return {
            ...row,
            kind: 'view',
            path: view,
            children: rowsOf(parts, view, `${id}/`, object && { ...object, path: [...object.path, parts.id] }, inside),
          };
        }
        return {
          ...row,
          kind: element.type === 'link' ? 'link' : parts ? 'instance' : 'node',
          path,
          children:
            !parts || !inside
              ? []
              : isHull(element)
                ? rowsOf(parts, path, `${id}/`, object, inside, { scene: held?.scene ?? layout.id, group: element.id })
                : rowsOf(parts, path, `${id}/`, { path: [parts.id], isolate: parts.id }, inside),
        };
      });
  };
  return root
    ? {
        id: root.id,
        kind: 'view',
        path: [root.id],
        label: root.name ?? scene?.name ?? root.id,
        children: rowsOf(root, [root.id], '', undefined, new Set([root.id])),
      }
    : { id: 'empty', kind: 'view', path: [], label: '', children: [] };
};

/** The document as drawn: each layout without its hidden layers' elements, or the links bound to them. */
export const withoutHidden = (doc: Scene.SceneDocument): Scene.SceneDocument => {
  let changed = false;
  const layouts = doc.layouts.map((layout) => {
    const hidden = hiddenElements(layout);
    if (hidden.size === 0) {
      return layout;
    }
    changed = true;
    const bound = (end?: ElementEndpoint) => end?.node !== undefined && hidden.has(end.node);
    const keep = <E extends Pick<Scene.Element2D, 'source' | 'target'>>(elements: Readonly<Record<string, E>>) =>
      Object.fromEntries(
        Object.entries(elements).filter(
          ([id, element]) => !hidden.has(id) && !bound(element.source) && !bound(element.target),
        ),
      );
    return layout.dim === '2d'
      ? { ...layout, elements: keep(layout.elements) }
      : { ...layout, elements: keep(layout.elements) };
  });
  return changed ? { ...doc, layouts } : doc;
};

/** The layers (bottom first) with `id` moved to `index`, its `z` between its new neighbours'. */
export const movedLayers = (layers: readonly Layer[], id: string, index: number): Layer[] => {
  const layer = layers.find((entry) => entry.id === id);
  if (!layer) {
    return [...layers];
  }
  const others = layers.filter((entry) => entry.id !== id);
  const at = Math.max(0, Math.min(index, others.length));
  others.splice(at, 0, { ...layer, z: between(others[at - 1]?.z, others[at]?.z) });
  return others;
};

/** Merging `ids` into `into`: the layers left, and the intent that moves the merged layers' elements onto `into`. */
export const mergedLayers = (
  layout: LayoutLike,
  ids: readonly string[],
  into: string,
): { layers: Layer[]; intent: LayoutIntent } => {
  const merged = new Set(ids.filter((id) => id !== into));
  return {
    layers: layersOf(layout).filter((layer) => !merged.has(layer.id)),
    intent: {
      kind: 'batch',
      intents: Object.values(layout.elements)
        .filter((element) => element.layer !== undefined && merged.has(element.layer))
        .map((element) => ({ kind: 'update', id: element.id, path: ['layer'], value: into })),
    },
  };
};

/** The intent that draws `id` just before or after `target`, among the layout's nodes (or its links). */
export const restackIntent = (
  layout: LayoutLike,
  id: string,
  target: string,
  position: 'before' | 'after',
): LayoutIntent => {
  const link = (element: Pick<Scene.Element2D, 'source'>) => element.source !== undefined;
  const moved = layout.elements[id];
  const siblings = Object.values(layout.elements)
    .filter((element) => element.id !== id && moved !== undefined && link(element) === link(moved))
    .sort(byZ);
  const index = siblings.findIndex((element) => element.id === target);
  const [low, high] =
    position === 'before' ? [siblings[index - 1], siblings[index]] : [siblings[index], siblings[index + 1]];
  return { kind: 'reorder', id, order: between(low?.z, high?.z) };
};

/** A copy of a model object under the first free `<id>-n` id, or undefined when no model holds it. */
export const duplicateObject = (doc: Scene.SceneDocument, id: string): ModelIntent | undefined => {
  const model = doc.models.find((entry) => entry.objects[id] !== undefined);
  const object = model?.objects[id];
  if (!model || !object) {
    return undefined;
  }
  let index = 2;
  while (model.objects[`${id}-${index}`] !== undefined) {
    index++;
  }
  return { kind: 'define', model: model.id, object: { ...object, id: `${id}-${index}` } };
};
