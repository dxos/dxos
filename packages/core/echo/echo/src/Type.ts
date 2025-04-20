//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import {
  EchoObject,
  type JsonSchemaType,
  Ref as Ref$,
  type TypeMeta,
  type Expando as Expando$,
  type ObjectId as ObjectId$,
  type BaseSchema,
  type EchoSchema,
  type ImmutableSchema,
} from '@dxos/echo-schema';

// NOTES:
// - New Echo package and namespaces allow for incremental migration.
// - Define types in namespace and drop Type suffix.
// - Split into separate ECHO namespaces: Database, Space, Type, Query, Queue.
//  - Example; import { Database, Type, Query, Queue } from '@dxos/echo';
// - Use `declare namespace` for types (no code is generated). See Effect pattern, where Schema is a namespace, interface, and function.
// - Pay attention to type bookkeeping (e.g., Schema.Variance).
// - Use @category annotations to group types in the API.
// - Test with @dxos/schema/testing types.

/**
 * Type API.
 *
 * @category api namespace
 * @since 0.9.0
 */
export declare namespace Type {
  /**
   * A globally unique identifier for an object.
   */
  export type ObjectId = ObjectId$;

  /**
   * A schema that can be extended with arbitrary properties.
   */
  export type Expando = Expando$;

  // TODO(burdon): Just Type and Immutable?
  export type Type<T = any> = BaseSchema<T>;
  export type ImmutableType<T> = ImmutableSchema<T>;
  export type MutableType<T> = EchoSchema<T>;

  /**
   * A persistable JSON Schema.
   */
  export type JsonSchema = JsonSchemaType;

  /**
   * A reference to an ECHO object.
   */
  export type Ref<T> = Ref$<T>;
}

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
export const def = ({ typename, version }: TypeMeta) => EchoObject({ typename, version });

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
