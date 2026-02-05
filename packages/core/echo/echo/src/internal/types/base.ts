//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type ObjectId } from '@dxos/keys';

import { type ATTR_META, type ObjectMeta } from './meta';

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Make internal.
// TODO(burdon): Prefer Record<string, unknown>.
export type AnyProperties = Record<string, any>;

/**
 * Canonical type for all ECHO entities (objects and relations).
 */
// TODO(wittjosiah): Remove. Prefer higher level types (e.g. Entity.Unknown).
export interface AnyEntity {
  readonly id: ObjectId;
}

export type ExcludeId<T extends AnyProperties> = Omit<T, 'id'>;

export type PropertyKey<T extends AnyProperties> = Extract<keyof ExcludeId<T>, string>;

// TODO(dmaretskyi): Remove. This should be using the symbol type.
type WithMeta = { [ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
): Schema.Schema<ExcludeId<Schema.Schema.Type<S>> & WithMeta, Schema.Schema.Encoded<S>> => {
  return Schema.make(SchemaAST.omit(schema.ast, ['id']));
};
