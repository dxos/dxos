//
// Copyright 2026 DXOS.org
//

import { type Timeline, createTimeline, getPath, setKey } from '@dxos/animation';
import { type Scene, findLayout } from '@dxos/scene';

/** A shot staging the open scene, as the Timeline panel lists and keys it: the animator's shot, by id. */
export type EditorShot = { id: string; name?: string; timeline: Timeline };

/** The element fields a dimension animates, by dot path (e.g. `center`, `rotation`, `overrides.opacity`). */
export type AnimatableFields = (element: Scene.Element2D | Scene.Element3D) => Readonly<Record<string, unknown>>;

/**
 * `timeline` with a key at `t` on each animatable field of each selected element, at the element's current value; a
 * timeline is made when there is none.
 */
export const keySelection = ({
  timeline = createTimeline(),
  document,
  layout,
  selection,
  t,
  fields,
}: {
  timeline?: Timeline;
  document: Scene.SceneDocument;
  layout: string;
  selection: readonly string[];
  t: number;
  fields: AnimatableFields;
}): Timeline => {
  const record = findLayout(document, layout);
  let next = timeline;
  for (const id of selection) {
    const element = record?.elements[id];
    if (!element) {
      continue;
    }
    for (const [path, value] of Object.entries(fields(element))) {
      if (value !== undefined) {
        next = setKey(next, id, path, { t, value });
      }
    }
  }
  return next;
};

/** The default animatable fields: the element's placement and, when it sets one, its own opacity. */
export const placementFields: AnimatableFields = (element) => ({
  center: element.center,
  ...('rotation' in element && element.rotation !== undefined ? { rotation: element.rotation } : {}),
  ...('scale' in element && element.scale !== undefined ? { scale: element.scale } : {}),
  ...(getPath(element, 'overrides.opacity') !== undefined
    ? { 'overrides.opacity': getPath(element, 'overrides.opacity') }
    : {}),
});
