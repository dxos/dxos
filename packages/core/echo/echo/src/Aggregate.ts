//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as EffectTypes from 'effect/Types';

import type * as Query from './Query';

/**
 * The aggregate spec sans name; the name is supplied by the `Query.aggregate` record key. A tagged
 * union per kind so `property`/`limit` are present exactly when the kind uses them (no unused
 * optional fields to guard against at read sites).
 */
export type Spec =
  | { kind: 'group'; property: string }
  | { kind: 'max'; property: string }
  | { kind: 'min'; property: string }
  | { kind: 'items'; limit?: number }
  | { kind: 'count' };

export const AggregateTypeId = '~@dxos/echo/Aggregate' as const;
export type AggregateTypeId = typeof AggregateTypeId;

/**
 * A per-group aggregate declaration, materialised as a top-level field on the flat result record
 * `Query.aggregate` produces and orderable via a following `orderBy(Order.property(name))`. Name it
 * via the record passed to `Query.aggregate({ name: Aggregate.max('created') })`.
 *
 * `T` is the query's element type (so a reduced/grouped property is checked against it); `V` is the
 * value the aggregate produces. {@link group} entries define the grouping keys; a record with no
 * `group` entries aggregates the entire input into a single row.
 */
export interface Aggregate<T, V> {
  readonly [AggregateTypeId]: { element: T; value: V };

  spec: Spec;
}

export type Any = Aggregate<any, any>;

/** Extracts the value type a {@link Aggregate} produces. */
export type ValueOf<A> = A extends Aggregate<any, infer V> ? V : never;

/** Computes the flat result type of `Query.aggregate(aggregates)` for a given aggregate record `A`. */
export type AggregationResult<A extends Record<string, Any>> = EffectTypes.Simplify<
  Query.AggregateResult & { readonly [N in keyof A]: ValueOf<A[N]> }
>;

class AggregateClass<T, V> implements Aggregate<T, V> {
  private static 'variance': Aggregate<any, any>['~Aggregate'] = {} as Aggregate<any, any>['~Aggregate'];

  static 'is'(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && '~Aggregate' in value;
  }

  'constructor'(public readonly spec: Spec) {}

  '~Aggregate' = AggregateClass.variance as Aggregate<T, V>['~Aggregate'];
}

/**
 * Group members by a scalar property. The record key names the result field carrying the coerced
 * group-key value; multiple `group` entries form a composite key. Members whose property is missing,
 * `null`, `undefined`, or non-scalar group under the `null` key, so the field value is `T[K] | null`.
 */
export const group = <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null> =>
  new AggregateClass({ kind: 'group', property });

/**
 * Aggregate the maximum of a scalar property across the group's members.
 * `T` is inferred from the `Query.aggregate` context, so `property` is checked against the query's
 * element type (like {@link Order.property}).
 */
export const max = <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null> =>
  new AggregateClass({ kind: 'max', property });

/**
 * Aggregate the minimum of a scalar property across the group's members.
 */
export const min = <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null> =>
  new AggregateClass({ kind: 'min', property });

/**
 * Collect the group's members, optionally capped to `limit` per group. Opt-in — groups carry no
 * members unless this aggregate is declared.
 */
export const items = <T>(options?: { limit?: number }): Aggregate<T, T[]> =>
  new AggregateClass({ kind: 'items', limit: options?.limit });

/**
 * Count the group's members. Opt-in — groups carry no count unless this aggregate is declared.
 */
export const count = <T>(): Aggregate<T, number> => new AggregateClass({ kind: 'count' });
