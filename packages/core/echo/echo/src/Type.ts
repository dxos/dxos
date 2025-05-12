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
  getSchema,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
  toJsonSchema,
} from '@dxos/echo-schema';
import { type SpaceId as SpaceId$ } from '@dxos/keys';
import { live as create$ } from '@dxos/live-object';

// NOTES:
// - New Echo package and namespaces allow for incremental migration; vastly simplifies imports.
// - Split into separate ECHO namespaces: Database, Space, Type, Query, Queue.
//  - Example; import { Database, Type, Query, Queue } from '@dxos/echo';
// - Use `declare namespace` for types (no code is generated). See Effect pattern, where Schema is a namespace, interface, and function.
// - Test with @dxos/schema/testing types.
// - Define user (Composer) types in namespace (e.g., of plugin) and drop Type suffix; remove all deprecated Braneframe types.

export type {
  // prettier-ignore
  BaseEchoObject as AnyObject,
  JsonSchemaType as JsonSchema,
  SpaceId$ as SpaceId,
  TypeMeta as Meta,
};
export {
  Expando$ as Expando,
  EntityKind as Kind,
  ObjectId$ as ObjectId,
  SpaceIdSchema, // TODO(burdon): Rename SpaceId
  getTypeAnnotation as getMeta,
  getSchema,
  getSchemaDXN as getDXN,
  getSchemaTypename as getTypename,
  getSchemaVersion as getVersion,
  isInstanceOf as instanceOf,
  toJsonSchema,
};

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

  export type SpaceId = SpaceId$;
  export const SpaceId = SpaceIdSchema;

  export type ObjectId = ObjectId$;
  export const ObjectId = ObjectId$;

  //
  // Objects
  //

  export type Any = BaseEchoObject;

  //
  // Schema
  //

  export type JsonSchema = JsonSchemaType;

  /**
   * A schema that can be extended with arbitrary properties.
   */
  export type Expando = Expando$;

  // TODO(burdon): Review/remove.
  export type Abstract<T = any> = BaseSchema<T>;
  export type ImmutableType<T> = ImmutableSchema<T>;
  export type MutableType<T> = EchoSchema<T>;

  //
  // Utils
  //

  export const instanceOf = isInstanceOf;
}

//
// Constructors
//

export const ref = Ref$.make;
export const create = create$;

//
// Combinators
//

/**
 * Defines an ECHO type.
 *
 * @example
 * ```ts
 * const Organization = S.Struct({
 *   name: S.String,
 * }).pipe(Type.def({ typename: 'example.com/type/Organization', version: '1.0.0' }));
 * ```
 */
export const def = (meta: TypeMeta) => EchoObject(meta);

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
