//
// Copyright 2026 DXOS.org
//

import { type ViewTreeItem } from '@dxos/react-ui-canvas';
import {
  type ElementEndpoint,
  type Layer,
  type Scene,
  findLayout,
  resolveLayout,
  rootScene,
  sceneLayout,
} from '@dxos/scene';

import { type ObjectEntry } from '../components/index.ts';

// The shared inspectors (Views, Objects, Layers) read their rows from a scene document of either dimension.

type LayoutLike = Pick<Scene.LayoutRecord, 'elements' | 'layers'>;

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

/**
 * The views tree over a document's scene: its layout as the root row, each element under it, and under an element
 * placing a composite object, that object's parts, read-only, as the 2D tree shows an instance's contents.
 */
export const layoutTree = (doc: Scene.SceneDocument, scene = rootScene(doc)): ViewTreeItem => {
  const root = sceneLayout(doc, scene);
  const rowsOf = (layout: Scene.LayoutRecord, path: string[], prefix: string, readonly: boolean, seen: Set<string>) => {
    const resolved = resolveLayout(doc, layout);
    return Object.values(layout.elements).map((element): ViewTreeItem => {
      const item = resolved[element.id];
      const parts = item?.parts === undefined || seen.has(item.parts) ? undefined : findLayout(doc, item.parts);
      const id = `${prefix}${element.id}`;
      return {
        id,
        kind: element.type === 'link' ? 'link' : parts ? 'instance' : 'node',
        element: element.id,
        path,
        container: layout.id,
        label: element.label ?? element.id,
        type: item?.type,
        ...(readonly ? { readonly: true, object: { path } } : {}),
        children: parts ? rowsOf(parts, [...path, parts.id], `${id}/`, true, new Set([...seen, parts.id])) : [],
      };
    });
  };
  return root
    ? {
        id: root.id,
        kind: 'view',
        path: [root.id],
        label: root.name ?? scene?.name ?? root.id,
        children: rowsOf(root, [root.id], '', false, new Set([root.id])),
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
