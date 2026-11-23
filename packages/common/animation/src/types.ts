//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * How a keyed value interpolates (plugin-animator DESIGN.md §5.2): `number` linearly, `point` and `size` per 2D axis,
 * `vec3` per 3D axis, `rotation` by quaternion slerp (stored as Euler degrees), `color` in OKLab, `discrete` held.
 */
export const AnimatableKind = Schema.Literals(['number', 'point', 'size', 'vec3', 'rotation', 'color', 'discrete']);
export type AnimatableKind = Schema.Schema.Type<typeof AnimatableKind>;

/**
 * Marks a property a timeline may key, with its value kind. A user annotation, so the marker is serialized with the
 * schema and survives stored and dynamic schemas.
 */
export const AnimatableAnnotation: Annotation.Annotation<AnimatableKind> = Annotation.make({
  id: 'org.dxos.annotation.animatable',
  schema: AnimatableKind,
});

/** A 3D vector: a position, a scale, or a rotation in Euler degrees. */
export const Vec3 = Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number });
export type Vec3 = Schema.Schema.Type<typeof Vec3>;

/** How the span that ends at a key is shaped; the named curves are cubic, `bezier` a CSS cubic-bezier. */
export const Easing = Schema.Union([
  Schema.Literals(['linear', 'step', 'ease-in', 'ease-out', 'ease-in-out']),
  Schema.Struct({ bezier: Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number]) }),
]);
export type Easing = Schema.Schema.Type<typeof Easing>;

/** A property's value at a time; `easing` shapes the span from the previous key to this one. */
export const Keyframe = Schema.Struct({
  t: Schema.Number,
  value: Schema.Unknown,
  easing: Schema.optional(Easing),
});
export type Keyframe = Schema.Schema.Type<typeof Keyframe>;

/**
 * One property of one target over time, keys sorted by `t`. `property` is a dot path into the target (`center`,
 * `params.rate`). `kind` names the interpolation where the stored value cannot (a rotation, a colour).
 */
export const Track = Schema.Struct({
  target: Schema.String,
  property: Schema.String,
  kind: Schema.optional(AnimatableKind),
  keys: Schema.Array(Keyframe),
});
export type Track = Schema.Schema.Type<typeof Track>;

/** An animation's length, and its tracks by id (`<target>:<property>`). */
export const Timeline = Schema.Struct({
  /** Seconds. */
  duration: Schema.Number,
  loop: Schema.optional(Schema.Boolean),
  /** Frames per second that frame stepping and export use; 30 when unset. */
  fps: Schema.optional(Schema.Number),
  tracks: Schema.Record(Schema.String, Track),
});
export type Timeline = Schema.Schema.Type<typeof Timeline>;
