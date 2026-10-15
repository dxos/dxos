//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { type DataService } from '@dxos/protocols/rpc';

import { BACKLOG_RECOUNT_INTERVAL, type IndexBacklog, IndexStatusTracker } from './index-status.ts';

describe('IndexStatusTracker', () => {
  let now = 0;
  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  const setup = (backlog: IndexBacklog) => {
    const tracker = new IndexStatusTracker();
    const statuses: DataService.IndexStatus[] = [];
    tracker.updated.on((status) => {
      statuses.push(status);
    });
    tracker.opened(backlog);
    const count = vi.fn<() => Promise<IndexBacklog>>();
    return { tracker, statuses, count };
  };

  test('a pass recounts the backlog at most once an interval, and emits one status', async () => {
    const { tracker, statuses, count } = setup({ rebuild: 600, catchUp: 0 });
    count.mockResolvedValue({ rebuild: 300, catchUp: 4 });
    await tracker.afterPass({ drained: false, catchUp: 0 }, count);
    expect(count).not.toHaveBeenCalled();

    now += BACKLOG_RECOUNT_INTERVAL;
    await tracker.afterPass({ drained: false, catchUp: 6 }, count);
    expect(count).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual([
      { phase: 'indexing', done: 0, total: 600 },
      { phase: 'indexing', done: 300, total: 600, catchUp: { done: 0, total: 10 } },
    ]);
  });

  test('a rebuild ends once the recount finds none, while catch-up goes on', async () => {
    const { tracker, count } = setup({ rebuild: 600, catchUp: 0 });
    count.mockResolvedValue({ rebuild: 0, catchUp: 0 });
    now += BACKLOG_RECOUNT_INTERVAL;
    await tracker.afterPass({ drained: false, catchUp: 20 }, count);
    expect(tracker.current).toEqual({ phase: 'idle', done: 0, total: 0, catchUp: { done: 0, total: 20 } });
  });

  test('feed catch-up from the last count adds to each pass', async () => {
    const { tracker, count } = setup({ rebuild: 0, catchUp: 3 });
    await tracker.afterPass({ drained: false, catchUp: 2 }, count);
    expect(tracker.current.catchUp).toEqual({ done: 0, total: 5 });
  });

  test('a drained pass ends the catch-up counted before it', async () => {
    const { tracker, count } = setup({ rebuild: 0, catchUp: 0 });
    await tracker.afterPass({ drained: false, catchUp: 5 }, count);
    expect(tracker.current.catchUp).toEqual({ done: 0, total: 5 });
    // As a batch of documents that never load drains with catch-up still behind it.
    await tracker.afterPass({ drained: true, catchUp: 5 }, count);
    expect(tracker.current).toEqual({ phase: 'idle', done: 0, total: 0 });
  });
});
