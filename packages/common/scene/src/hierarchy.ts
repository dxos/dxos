//
// Copyright 2026 DXOS.org
//

import { findLayout, resolveLayout, sceneLayout } from './document.ts';
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
