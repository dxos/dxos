//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { type AnyLiveObject as AnyLiveObject$ } from '@dxos/echo-db';
import {
  type BaseEchoObject,
  type BaseObject,
  type BaseSchema,
  type EchoSchema,
  EchoObject,
  EntityKind,
  Expando as Expando$,
  type ImmutableSchema,
  type JsonSchemaType,
  ObjectId as ObjectId$,
  Ref as Ref$,
  SpaceIdSchema as SpaceIdSchema$,
  type StoredSchema,
  type TypeMeta,
  getTypeAnnotation,
  getSchema as getSchema$,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
  isMutable as isMutable$,
  toJsonSchema as toJsonSchema$,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceId as SpaceId$ } from '@dxos/keys';
import { live as live$ } from '@dxos/live-object';

/**
 * Type System API.
 *
 * @category api namespace
 * @since 0.9.0
 */

//
// Keys
//

export const SpaceIdSchema = SpaceIdSchema$; // TODO(burdon): Reconcile with SpaceId as with ObjectId.
export const SpaceId = SpaceId$;
export type SpaceId = SpaceId$;

export const ObjectId = ObjectId$;
export type ObjectId = ObjectId$;

/**
 * Defines a reference to an ECHO object.
 *
 * @example
 * ```ts
 * import { Type } from '@dxos/echo';
 * const Person = Schema.Struct({
 *   name: Schema.String,
 *   organization: Type.Ref(Organization),
 * }).pipe(Type.def({
 *   typename: 'example.com/type/Person',
 *   version: '0.1.0',
 * }));
 * ```
 */
export const Ref = <S extends Schema.Schema.AnyNoContext>(self: S) => Ref$<Schema.Schema.Type<S>>(self);

//
// Objects
//

export const Kind = EntityKind;
export type AnyObject = BaseEchoObject;
export type AnyLiveObject<T extends BaseObject> = AnyLiveObject$<T>;

//
// Schema
//

export type JsonSchema = JsonSchemaType;

/**
 * A schema that can be extended with arbitrary properties.
 */
export const Expando = Expando$;
export type Expando = Expando$;

// TODO(burdon): Review/remove.
export type Abstract<T = any> = BaseSchema<T>;
export type ImmutableType<T> = ImmutableSchema<T>;
export type MutableType<T> = EchoSchema<T>;
export type StoredType = StoredSchema;

/**
 * Defines an ECHO type.
 *
 * @example
 * ```ts
 * import { Type } from '@dxos/echo';
 * const Organization = Schema.Struct({
 *   name: Schema.String,
 * }).pipe(Type.def({
 *   typename: 'example.com/type/Organization',
 *   version: '0.1.0',
 * }));
 * ```
 */
export const def = (meta: TypeMeta) => EchoObject(meta);

//
// Object utils
//

export const create = live$;

export const getSchema = getSchema$;
export const instanceOf = isInstanceOf;

//
// Type utils
//

// TODO(burdon): Reconcile getDXN and getTypename.
export const getDXN = getSchemaDXN;
export const getTypename = (schema: Schema.Schema.AnyNoContext): string => {
  const typename = getSchemaTypename(schema);
  invariant(typename, 'Invalid object');
  return typename;
};
export const getMeta = getTypeAnnotation;
export const getVersion = getSchemaVersion;
export const isMutable = isMutable$;
export const toJsonSchema = toJsonSchema$;
