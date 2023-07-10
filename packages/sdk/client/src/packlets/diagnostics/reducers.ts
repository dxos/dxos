//

/**
 * Generic composable reducer interface.
 */
//
// Copyright 2023 DXOS.org
//

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

export const reduceSeries = <T, S>(reducer: Reducer<T, S>, events: T[]): S => {
  const state = reducer.initialState();

  for (const event of events) {
    reducer.reduce(state, event);
  }

  return state;
};

export const createGroupReducer = <T, S>(
  groupKey: (event: T) => string,
  sub: Reducer<T, S>,
): Reducer<T, Record<string, S>> => ({
  initialState: () => ({}),
  reduce: (state: Record<string, S>, event: T) => {
    const key = groupKey(event);

    state[key] = sub.reduce(state[key] ?? sub.initialState(), event);

    return state;
  },
});

export type TimeRecord = { timestamp: Date };
export type TimeBucket = { start: number; period: number; count: number };

export const createBucketReducer = <T extends TimeRecord>(period: number): Reducer<T, TimeBucket[]> => ({
  initialState: () => [],
  reduce: (series: TimeBucket[], event: T) => {
    const { timestamp } = event;
    let bucket: TimeBucket = series[series.length - 1];
    if (!bucket || bucket.start + period < timestamp.getTime()) {
      bucket = { start: timestamp.getTime(), period, count: 0 };
      series.push(bucket);
    }

    bucket.count++;
    return series;
  },
});
