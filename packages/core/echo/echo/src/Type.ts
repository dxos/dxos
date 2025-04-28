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
  ObjectId,
  Ref as Ref$,
  getTypeAnnotation,
  getSchema,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
} from '@dxos/echo-schema';
import { live as create$, makeRef } from '@dxos/live-object';

// NOTES:
// - New Echo package and namespaces allow for incremental migration; vastly simplifies imports.
// - Split into separate ECHO namespaces: Database, Space, Type, Query, Queue.
//  - Example; import { Database, Type, Query, Queue } from '@dxos/echo';
// - Use `declare namespace` for types (no code is generated). See Effect pattern, where Schema is a namespace, interface, and function.
// - Test with @dxos/schema/testing types.
// - Define user (Composer) types in namespace (e.g., of plugin) and drop Type suffix; remove all deprecated Braneframe types.

export type { TypeMeta as Meta, JsonSchemaType as JsonSchema };
export {
  EntityKind as Kind,
  ObjectId,
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

export const ref = makeRef;
export const create = create$;

//
// Combinators
//

/**
 * Defines an ECHO type.
 *
 * @example
 * ```ts
 * const Org = S.Struct({
 *   name: S.String,
 * }).pipe(Type.def({ typename: 'example.com/type/Org', version: '1.0.0' }));
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
 *   employer: Type.Ref(Org),
 * }).pipe(Type.def({ typename: 'example.com/type/Contact', version: '1.0.0' }));
 * ```
 */
export const Ref = <S extends Schema.Schema.AnyNoContext>(self: S) => Ref$<Schema.Schema.Type<S>>(self);
