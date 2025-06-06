//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

/**
 * Used to access entity kind on live objects.
 */
export const EntityKindPropertyId: unique symbol = Symbol.for('@dxos/echo-schema/EntityKindProperty');
