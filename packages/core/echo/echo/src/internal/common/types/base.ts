//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';
import { type EntityId } from '@dxos/keys';

import { type ATTR_META, type EntityMeta } from './meta.ts';

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Prefer Record<string, unknown>.
export type AnyProperties = Record<string, any>;

/**
 * Canonical type for all ECHO entities (objects and relations).
 * @depreacted Remove, use Entity.Unknown instead.
 */
// TODO(wittjosiah): Remove. Prefer higher level types (e.g. Entity.Unknown).
export interface AnyEntity {
  readonly id: EntityId;
}

export type ExcludeId<T extends AnyProperties> = Omit<T, 'id'>;

export type PropertyKey<T extends AnyProperties> = Extract<keyof ExcludeId<T>, string>;

// TODO(dmaretskyi): Remove. This should be using the symbol type.
type WithMeta = { [ATTR_META]?: EntityMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
// `Schema.Top` leaves `Type` as `unknown`, which `ExcludeId` cannot accept; pinning it here states
// the object-shape requirement that v3's `Schema.Schema.Type<S>` carried implicitly.
export const RawObject = <S extends Schema.Top & { readonly Type: AnyProperties }>(
  schema: S,
): Schema.Codec<ExcludeId<S['Type']> & WithMeta, S['Encoded']> => {
  return Schema.make<Schema.Codec<ExcludeId<S['Type']> & WithMeta, S['Encoded']>>(SchemaAST.omit(schema.ast, ['id']));
};
