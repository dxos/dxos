//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { aggregateFeedSyncState, formatFeedSyncNote } from './feed-sync-state';

describe('aggregateFeedSyncState', () => {
  it('sums pending and total across namespaces', () => {
    expect(
      aggregateFeedSyncState([
        { namespace: 'data', blocksToPull: '2', blocksToPush: '1', totalBlocks: '10' },
        { namespace: 'trace', blocksToPull: '0', blocksToPush: '3', totalBlocks: '5' },
      ]),
    ).toEqual({ pending: 6, total: 15 });
  });

  it('returns zeros for an empty namespace list', () => {
    expect(aggregateFeedSyncState([])).toEqual({ pending: 0, total: 0 });
  });
});

describe('formatFeedSyncNote', () => {
  it('lists only namespaces with pending blocks', () => {
    expect(
      formatFeedSyncNote([
        { namespace: 'data', blocksToPull: '2', blocksToPush: '0', totalBlocks: '10' },
        { namespace: 'trace', blocksToPull: '0', blocksToPush: '0', totalBlocks: '5' },
      ]),
    ).toBe('data: 2');
  });

  it('returns undefined when nothing is pending', () => {
    expect(formatFeedSyncNote([{ namespace: 'data', blocksToPull: '0', blocksToPush: '0', totalBlocks: '1' }])).toBe(
      undefined,
    );
  });
});
