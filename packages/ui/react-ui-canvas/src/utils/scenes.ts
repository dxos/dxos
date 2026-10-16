//
// Copyright 2026 DXOS.org
//

import { type SceneMap } from '../model/store.ts';
import { type FrameNode, type NodeId, type Scene, type SceneId, isFrameNode } from '../model/types.ts';
import { sortByZ } from './order.ts';

/** A scene a scene shape may open, as the properties panel lists it. */
export type SceneOption = { value: SceneId; label: string };

/** The scenes the shapes of `scene` open. */
const childScenes = (scene: Scene | undefined): SceneId[] =>
  scene ? Object.values(scene.nodes).flatMap((node) => (isFrameNode(node) ? [node.scene] : [])) : [];

/** Whether `from`, or any scene it opens however deep, is one of `targets`. */
const reaches = (scenes: SceneMap, from: SceneId, targets: ReadonlySet<SceneId>): boolean => {
  const seen = new Set<SceneId>();
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
export const sceneOptions = (
  scenes: SceneMap,
  path: readonly SceneId[],
  filter: (id: SceneId) => boolean = () => true,
): SceneOption[] => {
  const ancestors = new Set(path);
  const labels = new Map<SceneId, string>();
  for (const scene of Object.values(scenes)) {
    for (const node of Object.values(scene.nodes)) {
      if (isFrameNode(node) && node.label && !labels.has(node.scene)) {
        labels.set(node.scene, node.label);
      }
    }
  }
  return Object.values(scenes)
    .filter((scene) => filter(scene.id) && !reaches(scenes, scene.id, ancestors))
    .map((scene) => ({ value: scene.id, label: scene.name ?? labels.get(scene.id) ?? scene.id }))
    .sort((left, right) => left.label.localeCompare(right.label));
};

/** A compound object: a frame onto a child scene, as the Objects panel lists it. */
export type CompoundEntry = {
  /** The frame ids from the root down to this frame: how the panel, and a timeline's selectors, address it. */
  path: NodeId[];
  /** The scene the frame is in. */
  scene: SceneId;
  /** The scenes from the root down to the one the frame is in: the view's path to show it. */
  scenePath: SceneId[];
  frame: FrameNode;
  /** The scene the frame opens. */
  child: SceneId;
  name: string;
  hidden: boolean;
  /** The compound objects of the child scene; none when it opens a scene already on the path. */
  children: CompoundEntry[];
};

/** What a compound object is called: its child scene's name, else the frame's label, else the scene id. */
export const compoundName = (scenes: SceneMap, frame: FrameNode): string =>
  scenes[frame.scene]?.name ?? frame.label ?? frame.scene;

/**
 * The compound objects of `root` as a tree, top first in each scene as they stack. A frame opening a scene missing
 * from the store is listed without children; one opening a scene already on the path is listed but not followed.
 */
export const compoundTree = (scenes: SceneMap, root: SceneId): CompoundEntry[] => {
  const walk = (id: SceneId, path: NodeId[], scenePath: SceneId[]): CompoundEntry[] => {
    const scene = scenes[id];
    if (!scene) {
      return [];
    }
    const frames = sortByZ(Object.values(scene.nodes).filter(isFrameNode)).reverse();
    return frames.map((frame) => {
      const framePath = [...path, frame.id];
      return {
        path: framePath,
        scene: id,
        scenePath,
        frame,
        child: frame.scene,
        name: compoundName(scenes, frame),
        hidden: frame.hidden === true,
        children: scenePath.includes(frame.scene) ? [] : walk(frame.scene, framePath, [...scenePath, frame.scene]),
      };
    });
  };
  return walk(root, [], [root]);
};

/** How many frames, in every scene of the store, open `id`. */
export const frameCount = (scenes: SceneMap, id: SceneId): number =>
  Object.values(scenes).reduce(
    (count, scene) =>
      count + Object.values(scene.nodes).filter((node) => isFrameNode(node) && node.scene === id).length,
    0,
  );
