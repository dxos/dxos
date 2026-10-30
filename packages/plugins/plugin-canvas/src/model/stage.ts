//
// Copyright 2026 DXOS.org
//

//
// A legacy scene canvas as an animator stage (plugin-animator F-4.2): what it offers to be keyed, as its node records
// name it, and how a sample of a shot draws, through the scene migration's reading of it (`legacyDocument`). The
// animator owns the timeline; the canvas only ever sees a sample of it.
//

import { type AnimatableKind, type Arranger, type ScriptProperties, getPath } from '@dxos/animation';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { OPACITY_PATH } from '@dxos/react-ui-canvas/headless';
import { type Node, type Point, type Scene } from '@dxos/scene';

import { readStyles, readViews, rootOf } from './content.ts';
import { legacyDocument, legacyElementPath } from './migrate-scenes.ts';
import { sceneBinding } from './scene-stage.ts';
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

/** A legacy canvas as the scene migration reads it, without writing it; undefined for another renderer's canvas. */
export const legacyStageDocument = (canvas: Drawing.Canvas): Scene.SceneDocument | undefined =>
  isSceneCanvas(canvas) ? legacyDocument(canvas.content, readStyles(canvas.styles)) : undefined;

/** A sample keyed by node paths (`style.opacity`, `text`) as the element paths of the migrated scene. */
export const legacyStageSample = (sample: AnimatorCapabilities.Sample): AnimatorCapabilities.Sample => ({
  ...sample,
  values: Object.fromEntries(
    Object.entries(sample.values).map(([target, values]) => [
      target,
      Object.fromEntries(Object.entries(values).map(([path, value]) => [legacyElementPath(path), value])),
    ]),
  ),
});

/**
 * The canvas's root-scene elements and links at a sample, in scene coordinates, for effects to bind to (plugin-animator
 * DESIGN.md §6), as a migrated scene binds them.
 */
export const canvasStageBinding = (
  canvas: Drawing.Canvas,
  sample: AnimatorCapabilities.Sample,
): AnimatorCapabilities.StageBinding => {
  const document = legacyStageDocument(canvas);
  return document ? sceneBinding(document, legacyStageSample(sample)) : { objects: {}, links: [] };
};
