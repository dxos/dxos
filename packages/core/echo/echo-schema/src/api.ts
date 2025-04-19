//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import {
  type BaseSchema,
  type EchoSchema,
  EchoObject,
  type Expando as Expando$,
  type ImmutableSchema,
  type JsonSchemaType,
  type ObjectId as ObjectId$,
  Ref as Ref$,
} from '.'; // TODO(burdon): Import directly once API is stable.

/**
 * ECHO API.
 */
export namespace Echo {
  export type ObjectId = ObjectId$;
  export type Expando = Expando$;

  export type Type<T = any> = BaseSchema<T>;
  export type MutableType<T> = EchoSchema<T>;
  export type ImmutableType<T> = ImmutableSchema<T>;

  export type Ref<T> = Ref$<T>;
  export type JsonSchema = JsonSchemaType;

  export const Type = ({ typename, version }: { typename: string; version: string }) =>
    EchoObject({ typename, version });
  export const Ref = <S extends Schema.Schema.AnyNoContext>(schema: S) => Ref$<Schema.Schema.Type<S>>(schema);
}
