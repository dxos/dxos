//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import {
  type BaseSchema,
  type EchoSchema,
  type Expando as Expando$,
  type ImmutableSchema,
  type JsonSchemaType,
  type TypeMeta,
  EchoObject,
  EntityKind,
  ObjectId as ObjectId$,
  Ref as Ref$,
  type SpaceIdSchema as SpaceId$,
  getTypeAnnotation,
  getSchema,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
  type BaseEchoObject,
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
  JsonSchemaType as JsonSchema,
  TypeMeta as Meta,
};
export {
  EntityKind as Kind,
  ObjectId$ as ObjectId,
  SpaceIdSchema as SpaceId,
  getTypeAnnotation as getMeta,
  getSchema,
  getSchemaDXN as getDXN,
  getSchemaTypename as getTypename,
  getSchemaVersion as getVersion,
  isInstanceOf as instanceOf,
};

/**
 * Type API.
 *
 * @category api namespace
 * @since 0.9.0
 */
export declare namespace Type {
  export type Any = BaseEchoObject;

  export const ObjectId = ObjectId$;
  export type ObjectId = ObjectId$;

  export const SpaceId = SpaceIdSchema;
  export type SpaceId = SpaceId$;

  /**
   * A schema that can be extended with arbitrary properties.
   */
  export type Expando = Expando$;

  export type Abstract<T = any> = BaseSchema<T>;
  export type ImmutableType<T> = ImmutableSchema<T>;
  export type MutableType<T> = EchoSchema<T>;
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
