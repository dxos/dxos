//
// Copyright 2025 DXOS.org
//

import type { ObjectId } from '@dxos/keys';

import { EntityKind, EntityKindSchema, KindId as KindId$, getEntityKind } from './internal';

// NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
//  However, we generally refer to Obj and Relation instances as "objects",
//  and many API methods accept both Obj.Any and Relation.Any (i.e., Entity.Any) instances.

export const Kind = EntityKind;
export type Kind = EntityKind;
export const KindSchema = EntityKindSchema;

export const KindId: unique symbol = KindId$ as any;
export type KindId = typeof KindId;

/**
 * Assigns a kind to an Object or Relation instance.
 */
// NOTE: Needed to make `isRelation` and `isObject` checks work.
export interface OfKind<K extends Kind> {
  readonly [KindId]: K;
  readonly id: ObjectId;
}

/**
 * Obj or Relation with a specific set of properties.
 */
export type Entity<Props> = OfKind<Kind> & Props;

/**
 * Any Obj or Relation.
 */
export interface Any extends OfKind<Kind> {}

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how typescript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 *
 * This type is very permissive and allows accessing any property on the object.
 * We should move to Obj.Any that is not permissive and requires explicit instanceof checks..
 */
export interface Arbitrary extends OfKind<Kind> {
  [key: string]: unknown;
}

export const getKind = getEntityKind;
