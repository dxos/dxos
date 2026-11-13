//
// Copyright 2026 DXOS.org
//

import { findLayout, findModel, resolveLayout, sceneLayout } from './document.ts';
import { type SceneDocument } from './Scene.ts';
import { type Problem } from './validate.ts';

/**
 * The layouts a document's root scene draws, depth-first from its layout, following composite objects' parts. A layout
 * reached again on the path that led to it is a cycle: it is reported and not descended, so a renderer walking this
 * order terminates.
 */
export const layoutTree = (doc: SceneDocument): { order: string[]; problems: Problem[] } => {
  const order: string[] = [];
  const problems: Problem[] = [];
  const visit = (id: string, path: readonly string[]) => {
    const layout = findLayout(doc, id);
    if (!layout) {
      return;
    }
    if (!order.includes(id)) {
      order.push(id);
    }
    for (const element of Object.values(resolveLayout(doc, layout))) {
      if (element.parts === undefined) {
        continue;
      }
      if (path.includes(element.parts)) {
        problems.push({
          part: 'layout',
          id,
          element: element.id,
          message: `The parts of "${element.object ?? element.id}" make a cycle.`,
        });
        continue;
      }
      visit(element.parts, [...path, element.parts]);
    }
  };
  const root = sceneLayout(doc);
  if (root) {
    visit(root.id, [root.id]);
  }
  return { order, problems };
};

/** Whether the layout `from`, or any parts layout it reaches, is `target`. */
const reaches = (doc: SceneDocument, from: string, target: string, seen: Set<string> = new Set()): boolean => {
  if (from === target) {
    return true;
  }
  const layout = findLayout(doc, from);
  if (!layout || seen.has(from)) {
    return false;
  }
  seen.add(from);
  return Object.values(resolveLayout(doc, layout)).some(
    (element) => element.parts !== undefined && reaches(doc, element.parts, target, seen),
  );
};

/** Whether placing the object `objectId` (of the layout's model) in `layoutId` would put a layout inside itself. */
export const placesCycle = (doc: SceneDocument, layoutId: string, objectId: string): boolean => {
  const layout = findLayout(doc, layoutId);
  const model = layout?.model === undefined ? undefined : findModel(doc, layout.model);
  const parts = model?.objects[objectId]?.parts;
  return parts !== undefined && reaches(doc, parts, layoutId);
};
