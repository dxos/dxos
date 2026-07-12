//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GroupBy } from './group-by';

describe('GroupBy.bucketTimestamp', () => {
  // A fixed local instant: 2026-03-18 (a Wednesday) at 14:37:12.
  const timestamp = new Date(2026, 2, 18, 14, 37, 12).getTime();

  test('null passes through', () => {
    expect(GroupBy.bucketTimestamp(null, 'day')).to.equal(null);
  });

  test('hour floors to the start of the hour', () => {
    expect(GroupBy.bucketTimestamp(timestamp, 'hour')).to.equal(new Date(2026, 2, 18, 14).getTime());
  });

  test('day floors to local midnight', () => {
    expect(GroupBy.bucketTimestamp(timestamp, 'day')).to.equal(new Date(2026, 2, 18).getTime());
  });

  test('week floors to the preceding Monday', () => {
    // 2026-03-18 is a Wednesday, so the week starts Monday 2026-03-16.
    expect(GroupBy.bucketTimestamp(timestamp, 'week')).to.equal(new Date(2026, 2, 16).getTime());
  });

  test('month floors to the first of the month', () => {
    expect(GroupBy.bucketTimestamp(timestamp, 'month')).to.equal(new Date(2026, 2, 1).getTime());
  });

  test('timestamps in the same day share a bucket; a different day does not', () => {
    const morning = new Date(2026, 2, 18, 8).getTime();
    const evening = new Date(2026, 2, 18, 22).getTime();
    const nextDay = new Date(2026, 2, 19, 1).getTime();
    expect(GroupBy.bucketTimestamp(morning, 'day')).to.equal(GroupBy.bucketTimestamp(evening, 'day'));
    expect(GroupBy.bucketTimestamp(morning, 'day')).not.to.equal(GroupBy.bucketTimestamp(nextDay, 'day'));
  });
});
