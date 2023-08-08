//
// Copyright 2023 DXOS.org
//

/**
 * Returns an array of unique values.
 */
export const reduceUniqueValues = (values: any[], accessor: (value: any) => any) => {
  const objects = values.reduce((values, value) => {
    values.add(accessor(value));
    return values;
  }, new Set());

  return Array.from(objects.values());
};

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
export const numericalValues = (values: any[], accessor: (value: any) => number) => {
  const result: NumericalValues = { total: 0, count: 0 };

  const sorted = values
    .map((value) => {
      const v = accessor(value);
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
    .sort((a, b) => a! - b!);

  if (sorted.length) {
    Object.assign(result, {
      count: sorted.length,
      mean: result.total / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
    });
  }

  return result;
};

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
