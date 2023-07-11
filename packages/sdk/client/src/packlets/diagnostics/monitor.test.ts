//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { TimeRecord, createBucketReducer, reduceSeries } from './reducers';

describe('Monitor', () => {
  test('bucket time series', () => {
    let timestamp = Date.now();
    const records: TimeRecord[] = range(100).map(() => {
      timestamp += Math.round(Math.random() * 100);
      return { timestamp: new Date(timestamp) };
    });

    const buckets = reduceSeries(createBucketReducer(100), records);
    expect(buckets.length).to.be.greaterThan(1);
    expect(buckets.length).to.be.lessThan(records.length);
  });
});
