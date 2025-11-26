//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import type * as Entity from '../../Entity';

/**
 * Entity kind.
 */
const EntityKindId = Symbol.for('@dxos/echo/EntityKind');

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

export const KindId: Entity.KindId = EntityKindId as any;
