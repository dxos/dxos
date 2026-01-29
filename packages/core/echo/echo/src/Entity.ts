//
// Copyright 2025 DXOS.org
//

import type { ObjectId } from '@dxos/keys';

import {
  type ChangeCallback,
  EntityKind,
  EntityKindSchema,
  KindId,
  type Mutable,
  change as change$,
  getEntityKind,
} from './internal';

// Re-export KindId from internal.
export { KindId };

// NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
//  However, we generally refer to Obj and Relation instances as "objects",
//  and many API methods accept both Obj.Any and Relation.Any (i.e., Entity.Unknown) instances.

export const Kind = EntityKind;
export type Kind = EntityKind;
export const KindSchema = EntityKindSchema;

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
 * Unknown Obj or Relation.
 */
export interface Unknown extends OfKind<Kind> {}

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how typescript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 *
 * This type is very permissive and allows accessing any property on the object.
 * We should move to Obj.Any that is not permissive and requires explicit instanceof checks..
 */
export interface Any extends OfKind<Kind> {
  [key: string]: unknown;
}

export const getKind = getEntityKind;

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of an entity within `Entity.change`.
 */
export type { Mutable };

/**
 * Perform mutations on an echo entity (object or relation) within a controlled context.
 *
 * All mutations within the callback are batched and trigger a single notification
 * when the callback completes. Direct mutations outside of `Entity.change` will throw
 * an error for echo entities.
 *
 * @param entity - The echo object or relation to mutate.
 * @param callback - The callback that performs mutations on the entity.
 *
 * @example
 * ```ts
 * // Works with objects
 * Entity.change(person, (p) => {
 *   p.name = 'Jane';
 * });
 *
 * // Works with relations
 * Entity.change(worksFor, (r) => {
 *   r.role = 'Senior Engineer';
 * });
 * ```
 *
 * Note: Accepts both objects and relations. Use `Obj.change` or `Relation.change` for type-specific APIs.
 */
export const change = <T extends Unknown>(entity: T, callback: ChangeCallback<T>): void => {
  change$(entity, callback);
};
