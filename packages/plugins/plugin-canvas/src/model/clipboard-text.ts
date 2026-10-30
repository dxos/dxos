//
// Copyright 2026 DXOS.org
//

import { Dsl } from '@dxos/diagram';
import { flattenLayout, fromCanvasView, liftLayout, toCanvasView } from '@dxos/react-ui-scene/canvas';
import { type Fragment, type Link, type Node, Scene, resolveLayout2D, resolveLayout3D } from '@dxos/scene';

type SceneDocument = Scene.SceneDocument;

/** A fragment's elements with each placed model object folded in, so the text needs no model to read. */
const inlined = (doc: SceneDocument, layout: Scene.LayoutRecord, fragment: Fragment): Fragment => {
  const keep = <E extends { object?: string; parts?: string }>({ object: _object, parts: _parts, ...element }: E) =>
    element;
  if (layout.dim === '2d' && fragment.dim === '2d') {
    const resolved = resolveLayout2D(doc, layout);
    return {
      ...fragment,
      elements: Object.fromEntries(
        Object.keys(fragment.elements).map((id) => [id, keep(resolved[id] ?? fragment.elements[id])]),
      ),
    };
  }
  if (layout.dim === '3d' && fragment.dim === '3d') {
    const resolved = resolveLayout3D(doc, layout);
    return {
      ...fragment,
      elements: Object.fromEntries(
        Object.keys(fragment.elements).map((id) => [id, keep(resolved[id] ?? fragment.elements[id])]),
      ),
    };
  }
  return fragment;
};

/** A copied fragment as `.dx` text, which pastes back into any canvas, a document or the assistant. */
export const fragmentText = (doc: SceneDocument, layout: Scene.LayoutRecord, fragment: Fragment): string =>
  Dsl.printScenes({ scenes: [], layouts: [inlined(doc, layout, fragment)], models: [] });

/** The first layout in `.dx` text, in the dimension it is pasted into: 2D lifted onto the ground, 3D flattened. */
export const readFragment = (text: string, dim: Scene.Dimension): Fragment | undefined => {
  let layout: Scene.LayoutRecord | undefined;
  try {
    layout = Dsl.readScenes(text).document.layouts[0];
  } catch {
    return undefined;
  }
  if (!layout) {
    return undefined;
  }
  return dim === '3d' ? liftLayout(layout) : flattenLayout(layout);
};

/** The 2D canvas's own clipboard: its nodes and the links between them. */
export type CanvasClipboard = { nodes: Node[]; links: Link[] };

const byId = <T extends { id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

/** The 2D canvas's clipboard as `.dx` text, its composite objects folded in. */
export const canvasClipboardText = ({ nodes, links }: CanvasClipboard): string => {
  const { layout, objects } = fromCanvasView({ id: 'clipboard', nodes: byId(nodes), links: byId(links) });
  const models: Scene.ModelRecord2D[] =
    layout.model === undefined ? [] : [{ id: layout.model, dim: '2d', objects: byId(objects) }];
  return fragmentText({ scenes: [], layouts: [layout], models }, layout, layout);
};

/** Scene text as the 2D canvas's clipboard: 3D flattened to its top-down view; undefined for text that is no scene. */
export const canvasClipboardFrom = (text: string): CanvasClipboard | undefined => {
  const fragment = readFragment(text, '2d');
  if (!fragment || fragment.dim !== '2d') {
    return undefined;
  }
  const view = toCanvasView({ scenes: [], layouts: [fragment], models: [] }, fragment);
  return { nodes: Object.values(view.nodes), links: Object.values(view.links) };
};
