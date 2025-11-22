//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ObjectId } from '@dxos/keys';

import { EntityKindId } from '../types';

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

export const KindId: unique symbol = EntityKindId as any;
export type KindId = typeof KindId;

/**
 * Assigns a kind to an Object or Relation instance.
 */
// NOTE: Needed to make `isRelation` and `isObject` checks work.
export interface OfKind<Kind extends EntityKind> {
  readonly id: ObjectId;
  readonly [KindId]: Kind;
}
