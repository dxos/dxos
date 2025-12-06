//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type ObjectId } from '@dxos/keys';

import { type ATTR_META, type ObjectMeta } from './meta';

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: ObjectId;
}

/**
 * Object that has an associated typename.
 * The typename is retrievable using {@link getTypename}.
 * The object can be used with {@link isInstanceOf} to check if it is an instance of a schema.
 */
export type HasTypename = {};

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Make internal.
// TODO(burdon): Prefer Record<string, unknown>.
export type AnyProperties = Record<string, any>;

/**
 * Canonical type for all ECHO objects.
 */
export interface AnyEchoObject extends HasId, HasTypename {}

// TODO(dmaretskyi): Remove; this type effectively disables type safety due to `any`.
export type WithId<T extends AnyProperties = AnyProperties> = T & HasId;

export type ExcludeId<T extends AnyProperties> = Omit<T, 'id'>;

export type PropertyKey<T extends AnyProperties> = Extract<keyof ExcludeId<T>, string>;

// TODO(dmaretskyi): Remove. This should be using the symbol type.
export type WithMeta = { [ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
): Schema.Schema<ExcludeId<Schema.Schema.Type<S>> & WithMeta, Schema.Schema.Encoded<S>> => {
  return Schema.make(SchemaAST.omit(schema.ast, ['id']));
};
