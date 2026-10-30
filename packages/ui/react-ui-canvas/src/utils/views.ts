//
// Copyright 2026 DXOS.org
//

import { type ViewId, isViewNode } from '@dxos/scene';

import { type View, type ViewMap } from '../model/index.ts';

/** A scene a scene shape may open, as the properties panel lists it. */
export type ViewOption = { value: ViewId; label: string };

/** The scenes the shapes of `scene` open. */
const childScenes = (scene: View | undefined): ViewId[] =>
  scene ? Object.values(scene.nodes).flatMap((node) => (isViewNode(node) ? [node.scene] : [])) : [];

/** Whether `from`, or any scene it opens however deep, is one of `targets`. */
const reaches = (scenes: ViewMap, from: ViewId, targets: ReadonlySet<ViewId>): boolean => {
  const seen = new Set<ViewId>();
  const pending = [from];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (targets.has(id)) {
      return true;
    }
    if (!seen.has(id)) {
      seen.add(id);
      pending.push(...childScenes(scenes[id]));
    }
  }
  return false;
};

/**
 * The scenes a shape in the scene at the head of `path` may open: any scene of the store, shared by as many shapes
 * as open it, except one that would open the path again, which would nest the scene in itself without end. An
 * unnamed scene reads as the label of a shape that opens it.
 */
export const viewOptions = (
  scenes: ViewMap,
  path: readonly ViewId[],
  filter: (id: ViewId) => boolean = () => true,
): ViewOption[] => {
  const ancestors = new Set(path);
  const labels = new Map<ViewId, string>();
  for (const scene of Object.values(scenes)) {
    for (const node of Object.values(scene.nodes)) {
      if (isViewNode(node) && node.label && !labels.has(node.scene)) {
        labels.set(node.scene, node.label);
      }
    }
  }
  return Object.values(scenes)
    .filter((scene) => filter(scene.id) && !reaches(scenes, scene.id, ancestors))
    .map((scene) => ({ value: scene.id, label: scene.name ?? labels.get(scene.id) ?? scene.id }))
    .sort((left, right) => left.label.localeCompare(right.label));
};
