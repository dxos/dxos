//
// Copyright 2025 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';

/**
 * A (possibly composite) group key: one coerced scalar component per grouped property.
 * Missing/undefined/non-scalar property values coerce to `null`.
 */
export type GroupKeyValue = Record<string, string | number | boolean | null>;

/** Scalar result of a `max`/`min` aggregate (`null` when the group has no scalar values). */
export type AggregateValue = string | number | boolean | null;

/** Named aggregate values computed for one group, keyed by the aggregate's result name. */
export type GroupAggregates = Record<string, AggregateValue>;

/**
 * Execution helpers for the `aggregate` query clause, shared by the host `QueryExecutor` and the
 * client `WorkingSetQueryExecutor`. The clause itself is declared in `QueryPlan.AggregateStep`; this
 * module holds the runtime grouping/pagination algorithms that the executors apply.
 */
export const GroupBy = Object.freeze({
  /**
   * Coerces a raw property value into a group-key component.
   * `typeof value` must be `string`, `number`, or `boolean`; anything else (missing,
   * `undefined`, `null`, objects, arrays, refs) collapses to `null`.
   */
  coerceKeyComponent: (value: unknown): string | number | boolean | null =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null,

  /**
   * Stable serialization of a composite group key (component order matters).
   * Used for wire encoding, group identity, and synthetic entry ids.
   */
  serializeGroupKey: (key: GroupKeyValue): string => JSON.stringify(key),

  /**
   * Partitions `items` into contiguous groups by `getKey`, preserving relative order within
   * each group. Groups are ordered by the first occurrence of their key in `items`.
   */
  partitionByGroupKey: <T>(items: readonly T[], getKey: (item: T) => string): T[] => {
    const buckets = new Map<string, T[]>();
    for (const item of items) {
      const key = getKey(item);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = [];
        buckets.set(key, bucket);
      }
      bucket.push(item);
    }

    return Array.from(buckets.values()).flat();
  },

  /**
   * Returns the items belonging to the first `count` distinct groups (group-level limit).
   * Assumes `items` are already partitioned into contiguous groups (see {@link partitionByGroupKey}).
   */
  takeGroups: <T>(items: readonly T[], count: number, getKey: (item: T) => string): T[] => {
    if (count <= 0) {
      return [];
    }
    const result: T[] = [];
    let seenGroups = 0;
    let currentKey: string | undefined;
    for (const item of items) {
      const key = getKey(item);
      if (key !== currentKey) {
        seenGroups += 1;
        currentKey = key;
        if (seenGroups > count) {
          break;
        }
      }
      result.push(item);
    }
    return result;
  },

  /**
   * Returns the items after dropping the first `count` distinct groups (group-level skip).
   * Assumes `items` are already partitioned into contiguous groups (see {@link partitionByGroupKey}).
   */
  dropGroups: <T>(items: readonly T[], count: number, getKey: (item: T) => string): T[] => {
    if (count <= 0) {
      return items.slice();
    }
    let seenGroups = 0;
    let currentKey: string | undefined;
    for (let index = 0; index < items.length; index++) {
      const key = getKey(items[index]);
      if (key !== currentKey) {
        seenGroups += 1;
        currentKey = key;
        if (seenGroups > count) {
          return items.slice(index);
        }
      }
    }
    return [];
  },

  /**
   * Compares two scalar aggregate/property values. `null` sorts last (largest), mirroring the
   * executors' own property comparison so aggregate ordering is consistent with member ordering.
   */
  compareScalar: (a: AggregateValue, b: AggregateValue): number => {
    if (a == null && b == null) {
      return 0;
    }
    if (a == null) {
      return 1;
    }
    if (b == null) {
      return -1;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? 1 : -1;
    }
    return String(a).localeCompare(String(b));
  },

  /**
   * Reduces a group's member values under a `max`/`min` aggregate. Ignores `null`s (values missing
   * or non-scalar); a group with no scalar values yields `null`.
   */
  reduceAggregate: (values: readonly AggregateValue[], kind: 'max' | 'min'): AggregateValue => {
    let result: AggregateValue = null;
    for (const value of values) {
      if (value == null) {
        continue;
      }
      if (result == null) {
        result = value;
        continue;
      }
      const comparison = GroupBy.compareScalar(value, result);
      if ((kind === 'max' && comparison > 0) || (kind === 'min' && comparison < 0)) {
        result = value;
      }
    }
    return result;
  },

  /**
   * Computes each group's scalar aggregates (`group`/`max`/`min`/`count`) and returns the same items
   * with those values stamped on every member (all members of a group share them), so a following
   * group-level `OrderStep` can order by them — including by a `group` field whose result name differs
   * from its source property. Assumes `items` are already partitioned into contiguous groups
   * (see {@link partitionByGroupKey}).
   *
   * If an `items`-kind aggregate declares its own `order`, each group's members are stably
   * re-sorted by it (via `compareByOrder`) before scalar aggregates are stamped — this ordering is
   * local to that aggregate's member selection, independent of whatever order the input stream
   * arrived in. `items` itself is not stamped: it is materialised (and capped to `limit`) at result
   * assembly, from the (possibly now re-sorted) member order this function returns.
   */
  withGroupAggregates: <T extends { aggregates?: GroupAggregates }>(
    items: readonly T[],
    getKey: (item: T) => string,
    aggregates: readonly QueryAST.GroupAggregate[],
    getProperty: (item: T, property: string) => unknown,
    compareByOrder?: (a: T, b: T, order: QueryAST.Order) => number,
  ): T[] => {
    const itemsOrder = aggregates.find(
      (aggregate): aggregate is Extract<QueryAST.GroupAggregate, { kind: 'items' }> =>
        aggregate.kind === 'items' && !!aggregate.order?.length,
    )?.order;
    const needsStamping = aggregates.some((aggregate) => aggregate.kind !== 'items');
    // Only group/max/min/count are stamped for ordering; `items` collects members at result assembly.
    if (!needsStamping && !itemsOrder) {
      return items.slice();
    }
    const result: T[] = [];
    let index = 0;
    while (index < items.length) {
      const key = getKey(items[index]);
      let end = index;
      while (end < items.length && getKey(items[end]) === key) {
        end += 1;
      }
      let members = items.slice(index, end);
      if (itemsOrder && compareByOrder) {
        members = [...members].sort((a, b) => {
          for (const order of itemsOrder) {
            const comparison = compareByOrder(a, b, order);
            if (comparison !== 0) {
              return comparison;
            }
          }
          return 0;
        });
      }
      if (!needsStamping) {
        result.push(...members);
        index = end;
        continue;
      }
      const computed: GroupAggregates = {};
      for (const aggregate of aggregates) {
        if (aggregate.kind === 'items') {
          continue;
        }
        computed[aggregate.name] =
          aggregate.kind === 'count'
            ? members.length
            : aggregate.kind === 'group'
              ? // All members of a group share the key, so read the group value off any member.
                GroupBy.coerceKeyComponent(getProperty(members[0], aggregate.property))
              : GroupBy.reduceAggregate(
                  members.map((member) => coerceScalar(getProperty(member, aggregate.property))),
                  aggregate.kind,
                );
      }
      for (const member of members) {
        result.push({ ...member, aggregates: computed });
      }
      index = end;
    }
    return result;
  },

  /**
   * Reorders whole groups by `compareGroups` (applied to each group's first member, since all
   * members share the group's key/aggregates), preserving within-group order and contiguity.
   * Stable: groups comparing equal keep their incoming relative order. Assumes `items` are already
   * partitioned into contiguous groups (see {@link partitionByGroupKey}).
   */
  orderGroups: <T>(items: readonly T[], getKey: (item: T) => string, compareGroups: (a: T, b: T) => number): T[] => {
    const groups: T[][] = [];
    let currentKey: string | undefined;
    for (const item of items) {
      const key = getKey(item);
      if (groups.length === 0 || key !== currentKey) {
        groups.push([]);
        currentKey = key;
      }
      groups[groups.length - 1].push(item);
    }
    return groups
      .map((group, index) => ({ group, index }))
      .sort((a, b) => {
        const comparison = compareGroups(a.group[0], b.group[0]);
        return comparison !== 0 ? comparison : a.index - b.index;
      })
      .flatMap(({ group }) => group);
  },
});

/** Coerces a raw property value to the scalar aggregate domain (non-scalars → `null`). */
const coerceScalar = (value: unknown): AggregateValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
