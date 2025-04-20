//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { type DXN as DXN$ } from '@dxos/keys';

import { EchoObject, type JsonSchemaType, Ref as Ref$, type TypeMeta } from './ast';
import { type Expando as Expando$, type ObjectId as ObjectId$ } from './object';
import { type BaseSchema, type EchoSchema, type ImmutableSchema } from './schema';

// NOTES:
// - Split into separate ECHO namespaces: Database, Space, Type, Query, Queue.
//  - Example; import { Database, Type, Query, Queue } from '@dxos/echo';
// - Use `declare namespace` for types (no code is generated). See Effect pattern, where Schema is a namespace, interface, and function.
// - Pay attention to type bookkeeping (e.g., Schema.Variance).
// - Use @category annotations to group types in the API.

/**
 * ECHO API.
 *
 * @category api namespace
 * @since 0.9.0
 */
// TODO(burdon): Rename Type.
export declare namespace Type {
  /**
   * A globally unique decentralized name or identifier.
   */
  // TODO(burdon): Keep as separate namespace.
  export type DXN = DXN$;

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

// NOTE: This would just be exported at the top level of this package.
export namespace Type {
  /**
   * Defines a reference to an ECHO object.
   *
   * @example
   * ```ts
   * import { Type } from '@dxos/echo';
   * const Contact = S.Struct({
   *   name: S.String,
   *   employer: Type.Ref(Org),
   * }).pipe(Type.define({ typename: 'example.com/type/Contact', version: '1.0.0' }));
   * ```
   */
  export const Ref = <S extends Schema.Schema.AnyNoContext>(self: S) => Ref$<Schema.Schema.Type<S>>(self);

  /**
   * Defines an ECHO type.
   *
   * @example
   * ```ts
   * const Org = S.Struct({
   *   name: S.String,
   * }).pipe(Type.define({ typename: 'example.com/type/Org', version: '1.0.0' }));
   * ```
   */
  export const define = ({ typename, version }: TypeMeta) => EchoObject({ typename, version });
}
