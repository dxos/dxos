//
// Copyright 2025 DXOS.org
//

/**
 * A (possibly composite) group key: one coerced scalar component per grouped property.
 * Missing/undefined/non-scalar property values coerce to `null`.
 */
export type GroupKeyValue = Record<string, string | number | boolean | null>;

/**
 * Execution helpers for the `group-by` query clause, shared by the host `QueryExecutor` and the
 * client `WorkingSetQueryExecutor`. The clause itself is declared in `QueryPlan.GroupByStep`; this
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
});
