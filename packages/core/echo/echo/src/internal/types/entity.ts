//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ChangeId as ChangeId$ } from '@dxos/live-object';

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

/**
 * Symbol for the change function on live objects.
 * Used to allow mutations within a controlled context.
 * Re-exported from live-object for backwards compatibility.
 */
export const ChangeId: typeof ChangeId$ = ChangeId$;
export type ChangeId = typeof ChangeId;
