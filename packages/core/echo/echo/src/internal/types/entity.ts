//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Entity from '../../Entity';

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

/**
 * Entity kind symbol.
 */
export const KindId: Entity.KindId = Symbol.for('@dxos/echo/EntityKind') as Entity.KindId;
