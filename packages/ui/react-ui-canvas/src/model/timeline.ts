//
// Copyright 2026 DXOS.org
//

//
// The canvas side of the timeline (ANIMATION.md §5): node paths, camera keys, and `sampleView`, the one place time
// meets the model. The neutral timeline (keys, easing, interpolation) is @dxos/animation's.
//

import { type AnimatableKind, type Timeline, type Track, setPath, trackId, trackValue } from '@dxos/animation';
import { type Node } from '@dxos/scene';

import { type Camera, CAMERA_TARGET, type View } from './types.ts';

/** The node with `next` at a dot path; its id and type never change. */
export const setNodePath = (node: Node, path: string, next: unknown): Node => {
  const [head, ...rest] = path.split('.');
  if (head === 'id' || head === 'type') {
    return node;
  }
  return { ...node, [head]: rest.length === 0 ? next : setPath(Reflect.get(node, head), rest.join('.'), next) };
};

//
// Animatable properties.
//

/** The track property of a node's opacity, which lives in its style. */
export const OPACITY_PATH = 'style.opacity';

/** The properties every node has that the timeline keys, for a node type whose schema the view does not know. */
export const BASE_ANIMATABLE: Readonly<Record<string, AnimatableKind>> = {
  center: 'point',
  size: 'size',
  rotation: 'number',
  [OPACITY_PATH]: 'number',
};

//
// Sampling.
//

/** The node with every tracked property set to its value at `t`; the same node when nothing is tracked. */
const sampleNode = (node: Node, tracks: readonly Track[], t: number): Node =>
  tracks.reduce<Node>((current, track) => {
    const value = trackValue(track, t);
    return value === undefined ? current : setNodePath(current, track.property, value);
  }, node);

/** Per scene, the last timeline and time sampled and the result: playback samples each time once, and hit tests re-read it. */
const sampled = new WeakMap<View, { timeline: Timeline; t: number; scene: View }>();

/**
 * The scene at time `t` of `timeline` (§5.3): every tracked property of every node set to its value then. The timeline
 * is the host's (an animator shot), never the scene's own. Pure and memoised on the scene, the timeline and the time;
 * without a timeline, or with one that keys nothing here, the scene is returned as it is.
 */
export const sampleView = (scene: View, timeline: Timeline | undefined, t: number): View => {
  if (!timeline || Object.keys(timeline.tracks).length === 0) {
    return scene;
  }
  const cached = sampled.get(scene);
  if (cached && cached.timeline === timeline && cached.t === t) {
    return cached.scene;
  }
  const byTarget = new Map<string, Track[]>();
  for (const track of Object.values(timeline.tracks)) {
    if (scene.nodes[track.target]) {
      byTarget.set(track.target, [...(byTarget.get(track.target) ?? []), track]);
    }
  }
  const nodes = { ...scene.nodes };
  for (const [target, tracks] of byTarget) {
    nodes[target] = sampleNode(scene.nodes[target], tracks, t);
  }
  const result = byTarget.size > 0 ? { ...scene, nodes } : scene;
  sampled.set(scene, { timeline, t, scene: result });
  return result;
};

/** The camera's keyed values at `t`: `x` and `y` are the scene point at the view's centre. */
export type CameraKey = Partial<{ x: number; y: number; zoom: number }>;

/** What the camera tracks say at `t`, or undefined when the timeline has none. */
export const sampleCamera = (timeline: Timeline | undefined, t: number): CameraKey | undefined => {
  if (!timeline) {
    return undefined;
  }
  const result: Record<string, number> = {};
  for (const property of ['x', 'y', 'zoom'] as const) {
    const track = timeline.tracks[trackId(CAMERA_TARGET, property)];
    const value = track ? trackValue(track, t) : undefined;
    if (typeof value === 'number') {
      result[property] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

/** The view's camera with the keyed centre and zoom applied, for a viewport of `width` by `height`. */
export const applyCameraKey = (camera: Camera, key: CameraKey, width: number, height: number): Camera => {
  const zoom = key.zoom ?? camera.zoom;
  const centre = {
    x: key.x ?? width / 2 / camera.zoom - camera.x,
    y: key.y ?? height / 2 / camera.zoom - camera.y,
  };
  return { zoom, x: width / 2 / zoom - centre.x, y: height / 2 / zoom - centre.y };
};

/** The camera as keys: the scene point at the view's centre, and the zoom. */
export const cameraKey = (camera: Camera, width: number, height: number): Required<CameraKey> => ({
  x: width / 2 / camera.zoom - camera.x,
  y: height / 2 / camera.zoom - camera.y,
  zoom: camera.zoom,
});
