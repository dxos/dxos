//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out.
// TODO(burdon): Consider mathjs for variance, standard deviations, etc.
// https://www.npmjs.com/package/mathjs

import { defaultMap } from './map';

export type Accessor<T, V> = string | ((value: T) => V);

export const accessBy = <T, V>(value: T, accessor: Accessor<T, V>) =>
  typeof accessor === 'function' ? accessor(value) : (value as Record<any, any>)[accessor];

export const median = (values: number[]) => {
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[mid];
  } else {
    return (values[mid - 1] + values[mid]) / 2;
  }
};

// TODO(burdon): Value Proto.
export type NumericalValues = {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  total: number;
  count: number;
};

/**
 * Returns an array of unique values.
 */
export const numericalValues = <T>(values: T[], accessor: Accessor<T, number>) => {
  const result: NumericalValues = { total: 0, count: 0 };

  const sorted: number[] = values
    .map((value) => {
      const v = accessBy(value, accessor);
      if (v === undefined || isNaN(v)) {
        return undefined;
      }

      result.total += v;
      if (result.min === undefined || v < result.min) {
        result.min = v;
      }
      if (result.max === undefined || v > result.max) {
        result.max = v;
      }

      return v;
    })
    .filter((value) => value !== undefined)
    .sort((a, b) => a! - b!) as number[];

  if (sorted.length) {
    Object.assign(result, {
      count: sorted.length,
      mean: result.total / sorted.length,
      median: median(sorted),
    });
  }

  return result;
};

/**
 * Returns an array of unique values.
 */
export const reduceSet = <T, V>(values: T[], accessor: Accessor<T, V>): Set<V> =>
  values.reduce((values, value) => {
    const v = accessBy(value, accessor);
    values.add(v);
    return values;
  }, new Set<V>());

/**
 * Returns an object containing values grouped by the given key accessor.
 */
export const reduceGroupBy = <T, K>(values: T[], accessor: Accessor<T, K>): Map<K, T[]> =>
  values.reduce((values, value) => {
    const key = accessBy(value, accessor);
    defaultMap(values, key, []).push(value);
    return values;
  }, new Map<K, T[]>());

/**
 * Generic composable reducer interface.
 */
export interface Reducer<T, S> {
  /**
   * Get initial state.
   */
  initialState(): S;

  /**
   * Apply event to state.
   */
  reduce(state: S, event: T): S;
}

/**
 * Applies the reducer to the array of values.
 */
export const reduceSeries = <T, S>(reducer: Reducer<T, S>, events: T[]): S => {
  const state = reducer.initialState();
  for (const event of events) {
    reducer.reduce(state, event);
  }

  return state;
};

/**
 * Reducer to group values.
 */
export const createGroupReducer = <T, S>(
  groupBy: (value: T) => string,
  sub: Reducer<T, S>,
): Reducer<T, Record<string, S>> => ({
  initialState: () => ({}),
  reduce: (state: Record<string, S>, event: T) => {
    const key = groupBy(event);
    state[key] = sub.reduce(state[key] ?? sub.initialState(), event);
    return state;
  },
});

export type TimeRecord = { timestamp: Date | number | string };
export type TimeBucket = { start: number; period: number; count: number };

export const getDate = (value: Date | number | string): Date => (value instanceof Date ? value : new Date(value));

/**
 * Reducer to group by time period.
 */
export const createBucketReducer = <T extends TimeRecord>(period: number): Reducer<T, TimeBucket[]> => ({
  initialState: () => [],
  reduce: (series: TimeBucket[], event: T) => {
    const timestamp = getDate(event.timestamp);
    let bucket: TimeBucket = series[series.length - 1];
    if (!bucket || bucket.start + period < timestamp.getTime()) {
      bucket = { start: timestamp.getTime(), period, count: 0 };
      series.push(bucket);
    }

    bucket.count++;
    return series;
  },
});
