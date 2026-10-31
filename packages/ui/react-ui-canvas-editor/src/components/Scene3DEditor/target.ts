//
// Copyright 2026 DXOS.org
//

import { type Scene, findLayout, findScene, resolveLayout3D } from '@dxos/scene';

/** The layout that owns an element of the scene, and the element's id in it. */
export type Target = { layout: string; element: string };

/**
 * The layout and element a render-list key names: a top-level key is the scene's layout's; `a/b` is element `b` of the
 * parts layout that `a`'s object shows, which every element placing that object shares.
 */
export const targetOf = (doc: Scene.SceneDocument, scene: string, key: string): Target | undefined => {
  const record = findScene(doc, scene);
  let layout = record && findLayout(doc, record.layout);
  const path = key.split('/');
  for (const [index, id] of path.entries()) {
    if (layout?.dim !== '3d') {
      return undefined;
    }
    const element = resolveLayout3D(doc, layout)[id];
    if (!element) {
      return undefined;
    }
    if (index === path.length - 1) {
      return { layout: layout.id, element: id };
    }
    layout = element.parts === undefined ? undefined : findLayout(doc, element.parts);
  }
  return undefined;
};
