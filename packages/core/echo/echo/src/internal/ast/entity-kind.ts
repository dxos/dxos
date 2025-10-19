//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);
