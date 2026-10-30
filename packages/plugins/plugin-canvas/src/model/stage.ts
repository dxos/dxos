//
// Copyright 2026 DXOS.org
//

//
// The canvas as an animator stage (plugin-animator F-4.2): what a canvas offers to be keyed, and the translation
// between the animator's `Sample` and the timeline the scene engine's animated projection reads. The animator owns
// the timeline; the canvas only ever sees a sample of it, encoded as held keys.
//

import {
  type AnimatableKind,
  type Arranger,
  type ScriptProperties,
  type Timeline,
  type Track,
  createTimeline,
  getPath,
  trackId,
  trackValue,
} from '@dxos/animation';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { CAMERA_TARGET, OPACITY_PATH, sampleView } from '@dxos/react-ui-canvas/headless';
import { type Node, type Point, endpointNode } from '@dxos/scene';

import { readViews, rootOf } from './content.ts';
import { isSceneCanvas } from './view-node.ts';

/** What a script's show, hide and layout write on a canvas node: its centre, its size, and its opacity. */
export const CANVAS_SCRIPT_PROPERTIES: ScriptProperties = { position: 'center', scale: 'size', opacity: OPACITY_PATH };

/** The animatable properties of a node, by dot path. */
export type NodeAnimatable = (node: Node) => Readonly<Record<string, AnimatableKind>>;

/** The value a property rests at when the node leaves it unset: a node is opaque until its style says otherwise. */
const restingValue = (node: Node, path: string): unknown =>
  getPath(node, path) ?? (path === OPACITY_PATH ? 1 : undefined);

/** The nodes of the canvas's root scene as stage targets, each with its animatable properties and their values. */
export const canvasStageTargets = (
  canvas: Drawing.Canvas,
  animatable: NodeAnimatable,
): AnimatorCapabilities.StageTarget[] => {
  if (!isSceneCanvas(canvas)) {
    return [];
  }
  const root = rootOf(canvas.content);
  const scene = root === undefined ? undefined : readViews(canvas.content)[root];
  return Object.values(scene?.nodes ?? {}).map((node) => {
    // A label is a type's own field, not a shared one.
    const label = getPath(node, 'label');
    const properties = Object.entries(animatable(node)).map(([path, kind]) => ({ path, kind }));
    return {
      id: node.id,
      label: typeof label === 'string' && label.length > 0 ? label : node.id,
      properties,
      values: Object.fromEntries(
        properties.flatMap(({ path }) => {
          const value = restingValue(node, path);
          return value === undefined ? [] : [[path, value]];
        }),
      ),
    };
  });
};

const pointOf = (value: unknown): Point | undefined => {
  const x = getPath(value, 'x');
  const y = getPath(value, 'y');
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
};

/** The centre of the targets' resting positions. */
const centroid = (targets: readonly string[], values: (target: string) => Readonly<Record<string, unknown>>) => {
  const points = targets.flatMap((target) => pointOf(values(target)[CANVAS_SCRIPT_PROPERTIES.position]) ?? []);
  return points.length === 0
    ? { x: 0, y: 0 }
    : {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };
};

const numberParam = (params: Readonly<Record<string, unknown>>, name: string, fallback: number): number => {
  const value = params[name];
  return typeof value === 'number' ? value : fallback;
};

/** Targets in a row through their centre, `spacing` (default 200) apart, in the order named. */
const row: Arranger = ({ targets, params, values }) => {
  const centre = centroid(targets, values);
  const spacing = numberParam(params, 'spacing', 200);
  const start = centre.x - ((targets.length - 1) * spacing) / 2;
  return Object.fromEntries(targets.map((target, index) => [target, { x: start + index * spacing, y: centre.y }]));
};

/** Targets evenly on a circle (`radius`, default 200) about their centre, the first at the top. */
const ring: Arranger = ({ targets, params, values }) => {
  const centre = centroid(targets, values);
  const radius = numberParam(params, 'radius', 200);
  return Object.fromEntries(
    targets.map((target, index) => {
      const angle = (index / targets.length) * Math.PI * 2 - Math.PI / 2;
      return [target, { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius }];
    }),
  );
};

/** The layouts a canvas shot's script may name. */
export const CANVAS_LAYOUTS: Readonly<Record<string, Arranger>> = { row, ring };

/**
 * A sample as a timeline the animated projection can read: one held key per sampled value, so it draws the sample at
 * any time. Camera values go on the camera's tracks (`x`, `y`, `zoom`).
 */
export const sampleToTimeline = (sample: AnimatorCapabilities.Sample): Timeline => {
  const tracks: Record<string, Track> = {};
  for (const [target, values] of Object.entries(sample.values)) {
    for (const [property, value] of Object.entries(values)) {
      tracks[trackId(target, property)] = { target, property, keys: [{ t: 0, value }] };
    }
  }
  for (const [property, value] of Object.entries(sample.camera ?? {})) {
    tracks[trackId(CAMERA_TARGET, property)] = { target: CAMERA_TARGET, property, keys: [{ t: 0, value }] };
  }
  return { ...createTimeline(0), tracks };
};

/**
 * What an edit at `t` changed, as stage edits: every node property whose value at `t` differs between the timeline
 * before and after, grouped by node. The camera is left out, since the canvas does not key it from a gesture.
 */
export const stageEdits = (before: Timeline, after: Timeline, t: number): AnimatorCapabilities.StageEdit[] => {
  const edits = new Map<string, Record<string, unknown>>();
  for (const [id, track] of Object.entries(after.tracks)) {
    if (track.target === CAMERA_TARGET) {
      continue;
    }
    const previous = before.tracks[id];
    const value = trackValue(track, t);
    if (previous && JSON.stringify(trackValue(previous, t)) === JSON.stringify(value)) {
      continue;
    }
    edits.set(track.target, { ...edits.get(track.target), [track.property]: value });
  }
  return [...edits].map(([target, values]) => ({ target, values }));
};

/**
 * The canvas's root-scene nodes and links at a sample, in scene coordinates, for effects to bind to (plugin-animator
 * DESIGN.md §6): a node's radius is half its shorter side, and a link runs straight between the centres of the nodes
 * it joins, so the binding needs no link router and stays React-free.
 */
export const canvasStageBinding = (
  canvas: Drawing.Canvas,
  sample: AnimatorCapabilities.Sample,
): AnimatorCapabilities.StageBinding => {
  if (!isSceneCanvas(canvas)) {
    return { objects: {}, links: [] };
  }
  const root = rootOf(canvas.content);
  const stored = root === undefined ? undefined : readViews(canvas.content)[root];
  if (!stored) {
    return { objects: {}, links: [] };
  }
  const scene = sampleView(stored, sampleToTimeline(sample), sample.t);
  const objects: Record<string, AnimatorCapabilities.BoundObject> = {};
  for (const node of Object.values(scene.nodes)) {
    const opacity = restingValue(node, OPACITY_PATH);
    objects[node.id] = {
      id: node.id,
      position: { x: node.center.x, y: node.center.y, z: 0 },
      radius: Math.min(node.size.width, node.size.height) / 2,
      opacity: typeof opacity === 'number' ? opacity : 1,
    };
  }
  const links = Object.values(scene.links).flatMap((link) => {
    const from = endpointNode(link.source);
    const to = endpointNode(link.target);
    const start = from === undefined ? undefined : objects[from];
    const end = to === undefined ? undefined : objects[to];
    return from !== undefined && to !== undefined && start && end
      ? [{ id: link.id, from, to, points: [start.position, end.position] }]
      : [];
  });
  return { objects, links };
};
