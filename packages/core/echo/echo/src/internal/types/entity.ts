//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

const EntityKindId = Symbol.for('@dxos/echo/EntityKind');

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

/**
 * Entity kind.
 */
export const KindId: unique symbol = EntityKindId as any;
export type KindId = typeof KindId;
