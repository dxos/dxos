//
// Copyright 2025 DXOS.org
//

import {
  type BaseSchema,
  EchoObject,
  type EchoSchema,
  type Expando as Expando$,
  type ImmutableSchema,
  type JsonSchemaType,
  type ObjectId as ObjectId$,
  Ref as Ref$,
} from '@dxos/echo-schema';
import { Schema } from 'effect';

/**
 * ECHO API.
 */
export namespace Echo {
  export type ObjectId = ObjectId$;
  export type Expando = Expando$;

  // TODO(burdon): Type or Schema? (Type matches effect and typename "example.com/type/Test").
  export type Type<T = any> = BaseSchema<T>;
  export type MutableType<T> = EchoSchema<T>; // TODO(burdon): Rename MutableSchema.
  export type ImmutableType<T> = ImmutableSchema<T>;

  export type Ref<T> = Ref$<T>;
  export type JsonSchema = JsonSchemaType;

  export const Type = ({ typename, version }: { typename: string; version: string }) => EchoObject(typename, version);
  export const Ref = <S extends Schema.Schema.AnyNoContext>(schema: S) => Ref$<Schema.Schema.Type<S>>(schema);
}
