//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/** Supported primitive geometry types. */
export const PrimitiveType = Schema.Literal('cube', 'sphere', 'cylinder', 'torus');
export type PrimitiveType = Schema.Schema.Type<typeof PrimitiveType>;

/** 3D vector. */
export const Vec3 = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number,
});
export type Vec3 = Schema.Schema.Type<typeof Vec3>;

/** 3D model object. */
export const Object = Schema.Struct({
  label: Schema.optional(Schema.String),
  primitive: PrimitiveType,
  position: Vec3.pipe(FormInputAnnotation.set(false)),
  scale: Vec3.pipe(FormInputAnnotation.set(false)),
  rotation: Vec3.pipe(FormInputAnnotation.set(false)),
  color: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.spacetime.object',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--cube--regular',
    hue: 'teal',
  }),
);
export type Object = Schema.Schema.Type<typeof Object>;

/** Create a model object with sensible defaults. */
export const make = (props?: Partial<Obj.MakeProps<typeof Object>>): Object =>
  Obj.make(Object, {
    primitive: 'cube',
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    ...props,
  });
