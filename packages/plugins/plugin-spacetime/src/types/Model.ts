//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/** Supported primitive geometry types. */
export const PrimitiveType = Schema.Literal('cube', 'sphere', 'cylinder', 'cone', 'pyramid');
export type PrimitiveType = Schema.Schema.Type<typeof PrimitiveType>;

/** Bundled preset model names. */
export const PresetType = Schema.Literal('firetruck', 'race', 'taxi');
export type PresetType = Schema.Schema.Type<typeof PresetType>;

/** Union of all object template types (primitives + presets). */
export type ObjectTemplate = PrimitiveType | PresetType;

/** 3D vector. */
export const Vec3 = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number,
});
export type Vec3 = Schema.Schema.Type<typeof Vec3>;

/**
 * Serialized mesh geometry.
 * Stores vertex positions and triangle indices as base64-encoded typed arrays.
 */
export const Mesh = Schema.Struct({
  /** Base64-encoded Float32Array of vertex positions (x,y,z per vertex). */
  vertexData: Schema.String,
  /** Base64-encoded Uint32Array of triangle indices. */
  indexData: Schema.String,
});
export type Mesh = Schema.Schema.Type<typeof Mesh>;

/**
 * 3D model object.
 *
 * Geometry is defined by either:
 * - `primitive` — parametric shape generated at runtime, or
 * - `mesh` — arbitrary geometry stored as serialized vertex/index data.
 *
 * These are mutually exclusive; `mesh` takes precedence if both are present.
 */
export const Object = Schema.Struct({
  label: Schema.optional(Schema.String),
  primitive: Schema.optional(PrimitiveType),
  mesh: Schema.optional(Mesh.pipe(FormInputAnnotation.set(false))),
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

//
// Mesh serialization helpers.
//

/** Encode a typed array to a base64 string for ECHO storage. */
export const encodeTypedArray = (array: Float32Array | Uint32Array): string => {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  let binary = '';
  for (let idx = 0; idx < bytes.length; idx++) {
    binary += String.fromCharCode(bytes[idx]);
  }
  return btoa(binary);
};

/** Decode a base64 string to a Float32Array. */
export const decodeFloat32Array = (base64: string): Float32Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let idx = 0; idx < binary.length; idx++) {
    bytes[idx] = binary.charCodeAt(idx);
  }
  return new Float32Array(bytes.buffer);
};

/** Decode a base64 string to a Uint32Array. */
export const decodeUint32Array = (base64: string): Uint32Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let idx = 0; idx < binary.length; idx++) {
    bytes[idx] = binary.charCodeAt(idx);
  }
  return new Uint32Array(bytes.buffer);
};
