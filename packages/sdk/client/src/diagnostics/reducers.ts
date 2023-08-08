//
// Copyright 2023 DXOS.org
//

/**
 * Returns an array of unique values.
 */
export const reduceUniqueValues = (values: any, accessor: (value: any) => any) => {
  const objects = values.reduce((values, value) => {
    values.add(accessor(value));
    return values;
  }, new Set());

  return Array.from(objects.values());
};

/**
 * Returns an array of unique values.
 */
export const numericalValues = (values: any, accessor: (value: any) => number) => {
  let total = 0;
  let min;
  let max;

  const sorted = values
    .map((value) => {
      const v = accessor(value);
      if (v === undefined || isNaN(v)) {
        return undefined;
      }

      total += v;
      if (min === undefined || v < min) {
        min = v;
      }
      if (max === undefined || v > max) {
        max = v;
      }

      return v;
    })
    .filter((value) => value !== undefined)
    .sort((a, b) => a - b);

  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
  return { min, max, mean: total / values.length, median, total, count: values.length };
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

export const getDate = (value: Date | number | string): Date =>
  typeof value instanceof Date ? value : new Date(value);

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
