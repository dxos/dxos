//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import {
  type BaseEchoObject,
  type BaseSchema,
  type EchoSchema,
  Expando as Expando$,
  type ImmutableSchema,
  type JsonSchemaType,
  ObjectId as ObjectId$,
  SpaceIdSchema,
  type TypeMeta,
  EchoObject,
  EntityKind,
  Ref as Ref$,
  getTypeAnnotation,
  getSchema as getSchema$,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
  toJsonSchema as toJsonSchema$,
} from '@dxos/echo-schema';
import { type SpaceId as SpaceId$ } from '@dxos/keys';
import { live as create$ } from '@dxos/live-object';

// TODO(burdon): Type vs. Object.

/**
 * Type System API.
 *
 * @category api namespace
 * @since 0.9.0
 */
export namespace Type {
  //
  // Keys
  //

  export const SpaceId = SpaceIdSchema;
  export type SpaceId = SpaceId$;

  export const ObjectId = ObjectId$;
  export type ObjectId = ObjectId$;

  //
  // Objects
  //

  export const Kind = EntityKind;
  export type AnyObject = BaseEchoObject;

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

  export const create = create$;

  /**
   * Type definition combinator.
   */
  export const def = (meta: TypeMeta) => EchoObject(meta);

  //
  // Refs
  //

  /**
   * Defines a reference to an ECHO object.
   *
   * @example
   * ```ts
   * import { Type } from '@dxos/echo';
   * const Contact = S.Struct({
   *   name: S.String,
   *   organization: Type.Ref(Organization),
   * }).pipe(Type.def({ typename: 'example.com/type/Contact', version: '1.0.0' }));
   * ```
   */
  export const Ref = <S extends Schema.Schema.AnyNoContext>(self: S) => Ref$<Schema.Schema.Type<S>>(self);

  export const ref = Ref$.make;

  //
  // Object utils
  //

  export const getMeta = getTypeAnnotation;
  export const getSchema = getSchema$;
  export const instanceOf = isInstanceOf;

  //
  // Type utils
  //

  // TODO(burdon): Reconcile getDXN and getTypename.
  export const getDXN = getSchemaDXN;
  export const getTypename = getSchemaTypename;
  export const getVersion = getSchemaVersion;
  export const toJsonSchema = toJsonSchema$;
}
