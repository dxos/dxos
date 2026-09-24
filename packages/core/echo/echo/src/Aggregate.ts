//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as EffectTypes from 'effect/Types';

import type { QueryAST } from '@dxos/echo-protocol';

import type * as Order from './Order.ts';
import type * as Query from './Query.ts';

/**
 * The aggregate spec sans name; the name is supplied by the `Query.aggregate` record key. A tagged
 * union per kind so `property`/`limit`/`order` are present exactly when the kind uses them (no
 * unused optional fields to guard against at read sites).
 */
export type Spec =
  | { kind: 'group'; properties: readonly [string, ...string[]] }
  | { kind: 'max'; property: string }
  | { kind: 'min'; property: string }
  | { kind: 'items'; limit?: number; order?: readonly QueryAST.Order[] }
  | { kind: 'count' }
  | { kind: 'type' }
  | { kind: 'timestamp'; field: 'createdAt' | 'updatedAt'; unit: TimeUnit }
  | { kind: 'time'; property: string; unit: TimeUnit }
  | { kind: 'sum'; property: string };

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
  Query.RecordResult & { readonly [N in keyof A]: ValueOf<A[N]> }
>;

class AggregateClass<T, V> implements Aggregate<T, V> {
  private static 'variance': Aggregate<any, any>[AggregateTypeId] = {} as Aggregate<any, any>[AggregateTypeId];

  static is(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && AggregateTypeId in value;
  }

  constructor(public readonly spec: Spec) {}

  [AggregateTypeId] = AggregateClass.variance as Aggregate<T, V>[AggregateTypeId];
}

/**
 * Group members by a scalar property, or by the first property of a `coalesce` chain holding a
 * scalar value (`threadId ?? id`). The record key names the result field carrying the coerced
 * group-key value; multiple `group` entries form a composite key (a `coalesce` chain is one
 * component, not several). Members whose key is missing, `null`, `undefined`, or non-scalar group
 * under the `null` key, so the field value includes `null`.
 *
 * A chain ending in an always-present property (e.g. `{ coalesce: ['threadId', 'id'] }`) gives each
 * member lacking the leading property its own singleton group instead of pooling them under `null`,
 * where an {@link items} `limit` would truncate unrelated members. `id` qualifies: it resolves to
 * the object's entity id even though documents don't store it as data.
 */
export const group: {
  <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null>;
  <T, const K extends readonly [keyof T & string, ...(keyof T & string)[]]>(key: {
    coalesce: K;
  }): Aggregate<T, T[K[number]] | null>;
} = (key: string | { coalesce: readonly [string, ...string[]] }): Any =>
  new AggregateClass({ kind: 'group', properties: typeof key === 'string' ? [key] : key.coalesce });

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
 * Collect the group's members, optionally ordered by `order` and capped to `limit` per group.
 * Opt-in — groups carry no members unless this aggregate is declared.
 *
 * `order` is this aggregate's own per-group ordering — independent of any `orderBy` elsewhere in
 * the query, which orders the whole input stream (and, following `aggregate`, the resulting
 * groups), not this aggregate's member selection. Without `order`, members keep whatever order
 * they arrived in from a preceding `orderBy` (unspecified if there is none), so a per-group
 * top-`limit` moved position in the chain would silently change; declaring `order` here makes the
 * ordering explicit and local to this aggregate regardless of where it sits.
 */
export const items = <T>(options?: { limit?: number; order?: Order.Any[] }): Aggregate<T, T[]> =>
  new AggregateClass({ kind: 'items', limit: options?.limit, order: options?.order?.map((order) => order.ast) });

/** Keys of `T` whose values are numbers. */
export type NumericKeys<T> = { [K in keyof T & string]: T[K] extends number | null | undefined ? K : never }[keyof T &
  string];

/**
 * Sum a numeric property across the group's members; values that are not numbers count as 0, so
 * a group always sums to a number.
 */
export const sum = <T, K extends NumericKeys<T>>(property: K): Aggregate<T, number> =>
  new AggregateClass({ kind: 'sum', property });

/**
 * Count the group's members. Opt-in — groups carry no count unless this aggregate is declared.
 */
export const count = <T>(): Aggregate<T, number> => new AggregateClass({ kind: 'count' });

/**
 * Group members by their stored type URI. The field carries the URI string as written, so two
 * schema versions are two groups.
 */
export const type = <T>(): Aggregate<T, string | null> => new AggregateClass({ kind: 'type' });

/**
 * Time units a timestamp aggregate can group by, both in UTC. To show local days, group by `hour` and
 * roll the hours into the viewer's days; an hour straddles local midnight in a zone offset by a
 * fraction of an hour (India, Newfoundland), so its members land on one side of it.
 */
export type TimeUnit = 'hour' | 'day';

/**
 * Group members by the UTC hour or day their system `updatedAt` falls in. The field carries the start
 * of that interval in unix ms, or `null` when the timestamp is unknown.
 */
export const updated = <T>(unit: TimeUnit): Aggregate<T, number | null> =>
  new AggregateClass({ kind: 'timestamp', field: 'updatedAt', unit });

/** Like {@link updated}, over the system `createdAt` timestamp. */
export const created = <T>(unit: TimeUnit): Aggregate<T, number | null> =>
  new AggregateClass({ kind: 'timestamp', field: 'createdAt', unit });

/**
 * Group members by the UTC hour or day a unix-ms property falls in, like {@link updated} over a
 * property instead of a system timestamp. The field carries the start of that interval in unix ms,
 * or `null` when the property is not a number.
 */
export const time = <T, K extends NumericKeys<T>>(property: K, unit: TimeUnit): Aggregate<T, number | null> =>
  new AggregateClass({ kind: 'time', property, unit });
