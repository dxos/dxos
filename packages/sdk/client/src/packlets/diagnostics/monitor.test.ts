//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

export type TimeRecord = { timestamp: number };
export type TimeBucket = { start: number; period: number; count: number };

export const createBucketReducer =
  (period: number) =>
  <T extends TimeRecord>(series: TimeBucket[], event: T) => {
    const { timestamp } = event;
    let bucket: TimeBucket = series[series.length - 1];
    if (!bucket || bucket.start + period < timestamp) {
      bucket = { start: timestamp, period, count: 0 };
      series.push(bucket);
    }

    bucket.count++;
    return series;
  };

describe('Monitor', () => {
  test('bucket time series', () => {
    let timestamp = Date.now();
    const records: TimeRecord[] = range(100).map(() => {
      timestamp += Math.round(Math.random() * 100);
      return { timestamp };
    });

    const buckets = records.reduce<TimeBucket[]>(createBucketReducer(100), []);
    expect(buckets.length).to.be.greaterThan(1);
    expect(buckets.length).to.be.lessThan(records.length);
  });
});
