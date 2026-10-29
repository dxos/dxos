//
// Copyright 2026 DXOS.org
//

import { type SceneDocument } from './Scene.ts';
import { type Problem } from './validate.ts';

/**
 * The document's scenes depth-first from the root, following child-scene elements. A scene reached again on the path
 * that led to it is a cycle: it is reported and not descended, so a renderer walking this order terminates.
 */
export const sceneTree = (doc: SceneDocument): { order: string[]; problems: Problem[] } => {
  const byId = new Map(doc.scenes.map((scene) => [scene.id, scene]));
  const order: string[] = [];
  const problems: Problem[] = [];
  const visit = (id: string, path: readonly string[]) => {
    const scene = byId.get(id);
    if (!scene) {
      return;
    }
    if (!order.includes(id)) {
      order.push(id);
    }
    for (const element of Object.values(scene.elements)) {
      if (element.scene === undefined) {
        continue;
      }
      if (path.includes(element.scene)) {
        problems.push({ scene: id, element: element.id, message: `Child scene "${element.scene}" makes a cycle.` });
        continue;
      }
      visit(element.scene, [...path, element.scene]);
    }
  };
  const root = doc.scenes[0];
  if (root) {
    visit(root.id, [root.id]);
  }
  return { order, problems };
};
