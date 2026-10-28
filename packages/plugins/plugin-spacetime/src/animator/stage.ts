//
// Copyright 2026 DXOS.org
//

//
// The spacetime scene as an animator stage (plugin-animator F-4.3): what a scene offers to be keyed, and each object's
// state at a sample in Babylon world coordinates. Pure of Babylon and of the DOM, so bindings are computed ahead of
// time and in tests.
//

import { type AnimatableKind, type Vec3, animatableProperties } from '@dxos/animation';
import { Type } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { Model, type Scene } from '#types';

import { resolveHex } from './colors.ts';

/** The radius of a primitive at scale 1: Babylon's built-in primitives are a unit across. */
export const PRIMITIVE_RADIUS = 0.5;

/** Stage-only properties: the text a label morphs from and how far the morph has gone (D-30). */
export const LABEL_FROM = 'labelFrom';
export const LABEL_MORPH = 'labelMorph';

const STAGE_PROPERTIES: Readonly<Record<string, AnimatableKind>> = {
  [LABEL_FROM]: 'discrete',
  [LABEL_MORPH]: 'number',
};

/** The keyable properties of every scene object: the schema's animatable fields and the stage's label morph. */
export const OBJECT_PROPERTIES: readonly AnimatorCapabilities.AnimatableProperty[] = Object.entries({
  ...animatableProperties(Type.getSchema(Model.Object)),
  ...STAGE_PROPERTIES,
}).map(([path, kind]) => ({ path, kind }));

/** An object of the scene drawn at one time. */
export type ObjectState = {
  id: string;
  primitive: Model.PrimitiveType;
  position: Vec3;
  scale: Vec3;
  /** Euler degrees. */
  rotation: Vec3;
  color: string;
  opacity: number;
  label: string;
  labelStyle: Model.LabelStyle;
  /** The text the label morphs from while `labelMorph` is below 1. */
  labelFrom: string;
  labelMorph: number;
  /** The object's extent from its centre: the primitive's radius times its largest scale. */
  radius: number;
};

/** The scene's objects whose references have loaded, in order. */
export const sceneObjects = (scene: Scene.Scene): Model.Object[] =>
  scene.objects.flatMap((ref) => (ref.target ? [ref.target] : []));

/** An object's values at rest, which a script starts from. */
export const restingValues = (object: Model.Object): Record<string, unknown> => ({
  position: { ...object.position },
  scale: { ...object.scale },
  rotation: { ...object.rotation },
  color: resolveHex(object.color),
  opacity: object.opacity ?? 1,
  label: object.label ?? '',
  labelStyle: object.labelStyle ?? 'plain',
  [LABEL_FROM]: '',
  [LABEL_MORPH]: 1,
});

/** The scene's objects as stage targets (F-2.4: the object id is the target id). */
export const spacetimeStageTargets = (scene: Scene.Scene): AnimatorCapabilities.StageTarget[] =>
  sceneObjects(scene).map((object) => ({
    id: object.id,
    label: object.label || object.primitive || object.id,
    properties: [...OBJECT_PROPERTIES],
    values: restingValues(object),
  }));

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** `value` as a vec3, or `fallback` when it is not one. */
export const vec3Or = (value: unknown, fallback: Vec3): Vec3 =>
  typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value
    ? {
        x: isNumber(value.x) ? value.x : fallback.x,
        y: isNumber(value.y) ? value.y : fallback.y,
        z: isNumber(value.z) ? value.z : fallback.z,
      }
    : fallback;

const numberOr = (value: unknown, fallback: number): number => (isNumber(value) ? value : fallback);

const stringOr = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback);

const isLabelStyle = (value: unknown): value is Model.LabelStyle =>
  value === 'hero' || value === 'title' || value === 'inside' || value === 'plain' || value === 'hidden';

/** The extent of a primitive at `scale` from its centre. */
export const radiusOf = (scale: Vec3): number =>
  PRIMITIVE_RADIUS * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));

/** An object with a sample's values for it applied; the object itself is never written. */
export const objectState = (object: Model.Object, values: Readonly<Record<string, unknown>> = {}): ObjectState => {
  const rest = restingValues(object);
  const scale = vec3Or(values.scale, object.scale);
  const labelStyle = values.labelStyle ?? rest.labelStyle;
  return {
    id: object.id,
    primitive: object.primitive ?? 'cube',
    position: vec3Or(values.position, object.position),
    scale,
    rotation: vec3Or(values.rotation, object.rotation),
    color: resolveHex(stringOr(values.color, stringOr(rest.color, ''))),
    opacity: Math.max(0, Math.min(1, numberOr(values.opacity, object.opacity ?? 1))),
    label: stringOr(values.label, object.label ?? ''),
    labelStyle: isLabelStyle(labelStyle) ? labelStyle : 'plain',
    labelFrom: stringOr(values[LABEL_FROM], ''),
    labelMorph: Math.max(0, Math.min(1, numberOr(values[LABEL_MORPH], 1))),
    radius: radiusOf(scale),
  };
};

/** Every loaded object of the scene at a sample. */
export const sceneState = (scene: Scene.Scene, sample: AnimatorCapabilities.Sample): ObjectState[] =>
  sceneObjects(scene).map((object) => objectState(object, sample.values[object.id]));

/**
 * The scene's objects and links at a sample, in Babylon world coordinates, for effects to bind to (plugin-animator
 * DESIGN.md §6): a link runs straight between the centres of the objects it joins.
 */
export const spacetimeStageBinding = (
  scene: Scene.Scene,
  sample: AnimatorCapabilities.Sample,
): AnimatorCapabilities.StageBinding => {
  const objects: Record<string, AnimatorCapabilities.BoundObject> = {};
  for (const state of sceneState(scene, sample)) {
    objects[state.id] = {
      id: state.id,
      position: state.position,
      radius: state.radius,
      color: state.color,
      opacity: state.opacity,
    };
  }
  const links = (scene.links ?? []).flatMap((link) => {
    const from = objects[link.from];
    const to = objects[link.to];
    return from && to ? [{ id: link.id, from: link.from, to: link.to, points: [from.position, to.position] }] : [];
  });
  return { objects, links };
};
