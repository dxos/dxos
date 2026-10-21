//
// Copyright 2026 DXOS.org
//

//
// The timeline (ANIMATION.md §5): keys on node and camera properties, and `sampleView`, the one place time meets the
// model. Everything here is pure, so the surface, hit testing, export and a generator's worker sample the same scene
// for the same time.
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import {
  AnimatableAnnotationId,
  type AnimatableKind,
  type Camera,
  CAMERA_TARGET,
  type Easing,
  type Keyframe,
  type Node,
  type Timeline,
  type Track,
  type View,
} from './types.ts';

/** Frames per second of a timeline that names none. */
export const DEFAULT_FPS = 30;

/** Keys closer than this in time are the same key: setting one there replaces it. */
const KEY_EPSILON = 1e-4;

/** The id of the track of `property` on `target`. */
export const trackId = (target: string, property: string): string => `${target}:${property}`;

/** A timeline with nothing on it, for a scene that starts animating. */
export const createTimeline = (duration = 5): Timeline => ({ duration, tracks: {} });

export const timelineFps = (timeline: Timeline | undefined): number => timeline?.fps ?? DEFAULT_FPS;

//
// Easing.
//

/** A CSS cubic-bezier as a function of progress, solved for x by Newton's method with a bisection fallback. */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): ((t: number) => number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x: number) => {
    let u = x;
    for (let iteration = 0; iteration < 8; iteration++) {
      const error = sampleX(u) - x;
      if (Math.abs(error) < 1e-7) {
        return u;
      }
      const slope = slopeX(u);
      if (Math.abs(slope) < 1e-6) {
        break;
      }
      u -= error / slope;
    }
    let low = 0;
    let high = 1;
    u = x;
    for (let iteration = 0; iteration < 32; iteration++) {
      const value = sampleX(u);
      if (Math.abs(value - x) < 1e-7) {
        break;
      }
      if (value < x) {
        low = u;
      } else {
        high = u;
      }
      u = (low + high) / 2;
    }
    return u;
  };
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solve(t)));
};

/** Progress through a span (0 to 1) shaped by `easing`. */
export const ease = (easing: Easing | undefined, progress: number): number => {
  const t = Math.min(1, Math.max(0, progress));
  if (easing === undefined || easing === 'linear') {
    return t;
  }
  if (typeof easing === 'object') {
    return cubicBezier(...easing.bezier)(t);
  }
  switch (easing) {
    case 'step':
      return t < 1 ? 0 : 1;
    case 'ease-in':
      return t * t * t;
    case 'ease-out':
      return 1 - (1 - t) ** 3;
    case 'ease-in-out':
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }
};

//
// Values.
//

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNumberField = (value: Record<string, unknown>, key: string) => typeof value[key] === 'number';

/** The kind of a value as stored, which picks how it is interpolated (§5.2). */
export const valueKind = (value: unknown): AnimatableKind => {
  if (typeof value === 'number') {
    return 'number';
  }
  if (isRecord(value) && isNumberField(value, 'x') && isNumberField(value, 'y')) {
    return 'point';
  }
  if (isRecord(value) && isNumberField(value, 'width') && isNumberField(value, 'height')) {
    return 'size';
  }
  return 'discrete';
};

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** The value `amount` of the way from `from` to `to`: per number or per axis, and held for anything else. */
export const interpolate = (from: unknown, to: unknown, amount: number): unknown => {
  const kind = valueKind(from);
  if (kind !== valueKind(to)) {
    return amount < 1 ? from : to;
  }
  if (kind === 'number' && typeof from === 'number' && typeof to === 'number') {
    return lerp(from, to, amount);
  }
  if (isRecord(from) && isRecord(to) && kind === 'point') {
    return { x: lerp(Number(from.x), Number(to.x), amount), y: lerp(Number(from.y), Number(to.y), amount) };
  }
  if (isRecord(from) && isRecord(to) && kind === 'size') {
    return {
      width: lerp(Number(from.width), Number(to.width), amount),
      height: lerp(Number(from.height), Number(to.height), amount),
    };
  }
  return amount < 1 ? from : to;
};

/** A track's value at `t`: the end values outside its keys, the eased tween between the two keys around `t`. */
export const trackValue = (track: Track, t: number): unknown => {
  const { keys } = track;
  if (keys.length === 0) {
    return undefined;
  }
  if (t <= keys[0].t) {
    return keys[0].value;
  }
  const last = keys[keys.length - 1];
  if (t >= last.t) {
    return last.value;
  }
  const index = keys.findIndex((key) => key.t > t);
  const from = keys[index - 1];
  const to = keys[index];
  return interpolate(from.value, to.value, ease(to.easing, (t - from.t) / (to.t - from.t)));
};

//
// Property paths.
//

/** The value at a dot path. */
export const getPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);

/** A copy of `value` with `next` at a dot path, copying each record on the way down. */
export const setPath = (value: unknown, path: string, next: unknown): Record<string, unknown> => {
  const [head, ...rest] = path.split('.');
  const record: Record<string, unknown> = isRecord(value) ? { ...value } : {};
  record[head] = rest.length === 0 ? next : setPath(record[head], rest.join('.'), next);
  return record;
};

/** A copy of `value` without the field at a dot path, copying each record on the way down. */
export const removePath = (value: unknown, path: string): unknown => {
  if (!isRecord(value)) {
    return value;
  }
  const [head, ...rest] = path.split('.');
  const { [head]: child, ...others } = value;
  return rest.length === 0 ? others : { ...others, [head]: removePath(child, rest.join('.')) };
};

/** The node with `next` at a dot path; its id and type never change. */
export const setNodePath = (node: Node, path: string, next: unknown): Node => {
  const [head, ...rest] = path.split('.');
  if (head === 'id' || head === 'type') {
    return node;
  }
  return { ...node, [head]: rest.length === 0 ? next : setPath(Reflect.get(node, head), rest.join('.'), next) };
};

//
// Keys.
//

/** The timeline with `key` on the track of `property` on `target`, replacing a key at the same time. */
export const setKey = (timeline: Timeline, target: string, property: string, key: Keyframe): Timeline => {
  const id = trackId(target, property);
  const track = timeline.tracks[id] ?? { target, property, keys: [] };
  const keys = [...track.keys.filter((existing) => Math.abs(existing.t - key.t) > KEY_EPSILON), key].sort(
    (left, right) => left.t - right.t,
  );
  return { ...timeline, tracks: { ...timeline.tracks, [id]: { ...track, keys } } };
};

/** The timeline without the key at `t` on the track of `property` on `target`; an emptied track goes. */
export const removeKey = (timeline: Timeline, target: string, property: string, t: number): Timeline => {
  const id = trackId(target, property);
  const track = timeline.tracks[id];
  if (!track) {
    return timeline;
  }
  const keys = track.keys.filter((existing) => Math.abs(existing.t - t) > KEY_EPSILON);
  if (keys.length === track.keys.length) {
    return timeline;
  }
  const { [id]: _, ...tracks } = timeline.tracks;
  return { ...timeline, tracks: keys.length > 0 ? { ...tracks, [id]: { ...track, keys } } : tracks };
};

/**
 * The timeline with the keys of `targets` within `tolerance` of `from` moved to `to`, each keeping its value and easing
 * and replacing a key already at `to`; the same timeline when nothing moves.
 */
export const moveKeys = (
  timeline: Timeline,
  targets: ReadonlySet<string>,
  from: number,
  to: number,
  tolerance = KEY_EPSILON,
): Timeline => {
  let next = timeline;
  for (const track of Object.values(timeline.tracks)) {
    if (!targets.has(track.target)) {
      continue;
    }
    for (const key of track.keys.filter((key) => Math.abs(key.t - from) <= tolerance)) {
      next = setKey(removeKey(next, track.target, track.property, key.t), track.target, track.property, {
        ...key,
        t: to,
      });
    }
  }
  return next;
};

/** The timeline without the tracks of `targets` (deleted nodes), or the same timeline when it has none. */
export const removeTargets = (timeline: Timeline, targets: ReadonlySet<string>): Timeline => {
  const entries = Object.entries(timeline.tracks);
  const kept = entries.filter(([, track]) => !targets.has(track.target));
  return kept.length === entries.length ? timeline : { ...timeline, tracks: Object.fromEntries(kept) };
};

/** Whether `property` of `target` has a track. */
export const hasTrack = (timeline: Timeline | undefined, target: string, property: string): boolean =>
  timeline?.tracks[trackId(target, property)] !== undefined;

/** The times of every key on the tracks of `targets`, ascending and without repeats. */
export const keyTimes = (timeline: Timeline | undefined, targets: Iterable<string>): number[] => {
  if (!timeline) {
    return [];
  }
  const wanted = new Set(targets);
  const times = Object.values(timeline.tracks)
    .filter((track) => wanted.has(track.target))
    .flatMap((track) => track.keys.map((key) => key.t))
    .sort((left, right) => left - right);
  return times.filter((time, index) => index === 0 || time - times[index - 1] > KEY_EPSILON);
};

//
// Animatable properties.
//

/** The track property of a node's opacity, which lives in its style. */
export const OPACITY_PATH = 'style.opacity';

/**
 * The animatable properties of a node schema, by dot path, with their kinds (`AnimatableAnnotationId`). A struct
 * property that is not itself animatable is searched for animatable fields (`style.opacity`).
 */
export const animatableProperties = (schema: Schema.Top): Record<string, AnimatableKind> =>
  animatableFields(schema.ast, '');

const animatableFields = (ast: SchemaAST.AST, prefix: string): Record<string, AnimatableKind> => {
  const struct = structOf(ast);
  if (!struct) {
    return {};
  }
  const result: Record<string, AnimatableKind> = {};
  for (const signature of struct.propertySignatures) {
    if (typeof signature.name !== 'string') {
      continue;
    }
    const path = `${prefix}${signature.name}`;
    const kind = animatableKind(signature.type);
    if (kind) {
      result[path] = kind;
    } else {
      Object.assign(result, animatableFields(signature.type, `${path}.`));
    }
  }
  return result;
};

/** The struct a property holds; an optional struct is a union with undefined. */
const structOf = (ast: SchemaAST.AST): SchemaAST.Objects | undefined => {
  if (SchemaAST.isObjects(ast)) {
    return ast;
  }
  return SchemaAST.isUnion(ast) ? ast.types.find(SchemaAST.isObjects) : undefined;
};

const ANIMATABLE_KINDS: readonly AnimatableKind[] = ['number', 'point', 'size', 'discrete'];

const animatableKind = (ast: SchemaAST.AST): AnimatableKind | undefined => {
  const own = SchemaAST.resolve(ast)?.[AnimatableAnnotationId];
  const found = ANIMATABLE_KINDS.find((kind) => kind === own);
  if (found) {
    return found;
  }
  // An optional field is a union with undefined; its annotation is on the member.
  if (SchemaAST.isUnion(ast)) {
    for (const member of ast.types) {
      const kind = animatableKind(member);
      if (kind) {
        return kind;
      }
    }
  }
  return undefined;
};

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

/** Per scene, the last time sampled and its result: playback samples each time once, and hit tests re-read it. */
const sampled = new WeakMap<View, { t: number; scene: View }>();

/**
 * The scene at time `t` (§5.3): every tracked property of every node set to its value then. Pure and memoised on the
 * scene and the time; a scene without a timeline is returned as it is.
 */
export const sampleView = (scene: View, t: number): View => {
  const { timeline } = scene;
  if (!timeline || Object.keys(timeline.tracks).length === 0) {
    return scene;
  }
  const cached = sampled.get(scene);
  if (cached && cached.t === t) {
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
  const result = { ...scene, nodes };
  sampled.set(scene, { t, scene: result });
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

/** Time `t` wrapped or clamped into the timeline, as playback treats it. */
export const clampTime = (timeline: Timeline | undefined, t: number): number => {
  const duration = timeline?.duration ?? 0;
  if (duration <= 0) {
    return Math.max(0, t);
  }
  return timeline?.loop ? ((t % duration) + duration) % duration : Math.min(duration, Math.max(0, t));
};
