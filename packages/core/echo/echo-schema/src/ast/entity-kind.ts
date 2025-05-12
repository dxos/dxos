/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
//
// Copyright 2025 DXOS.org
//

export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

/**
 * Used to access entity kind on live objects.
 */
export const EntityKindPropertyId: unique symbol = Symbol.for('@dxos/echo-schema/EntityKindProperty');
