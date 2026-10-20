//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { IndexEngine } from '@dxos/index-core';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import {
  BACKLOG_RECOUNT_INTERVAL,
  type IndexBacklog,
  IndexStatusTracker,
  countIndexBacklog,
  readFeedPin,
} from './index-status.ts';

describe('IndexStatusTracker', () => {
  let now = 0;
  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const backlog = (documents: number, blocks = 0, catchUp = 0): IndexBacklog => ({ documents, blocks, catchUp });

  const setup = async (documents: number) => {
    const tracker = new IndexStatusTracker();
    const count = vi.fn<() => Promise<IndexBacklog>>().mockResolvedValue(backlog(documents));
    await tracker.opened(count);
    count.mockClear();
    const statuses: DataService.IndexStatus[] = [];
    tracker.updated.on((status) => {
      statuses.push(status);
    });
    const countingPass = () => {
      now += BACKLOG_RECOUNT_INTERVAL;
      expect(tracker.beginPass()).toBe(true);
    };
    return { tracker, statuses, count, countingPass };
  };

  test('a pass counts at most once an interval', async () => {
    const { tracker } = await setup(0);
    expect(tracker.beginPass()).toBe(false);
    now += BACKLOG_RECOUNT_INTERVAL;
    expect(tracker.beginPass()).toBe(true);
    expect(tracker.beginPass()).toBe(false);
  });

  test('only a counting pass recounts the backlog', async () => {
    const { tracker, statuses, count, countingPass } = await setup(600);
    count.mockResolvedValue(backlog(200, 100, 4));
    tracker.beginPass();
    await tracker.afterPass({ drained: false });
    expect(count).not.toHaveBeenCalled();

    countingPass();
    await tracker.afterPass({ drained: false, catchUp: 6 });
    expect(count).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual([{ phase: 'indexing', done: 300, total: 600 }]);
    expect(tracker.activity).toEqual({ catchUp: { done: 0, total: 10 } });
  });

  test('catch-up and full-text work never change the status', async () => {
    const { tracker, statuses, count, countingPass } = await setup(600);
    count.mockResolvedValue(backlog(600, 0, 3));
    countingPass();
    await tracker.afterPass({ drained: false, catchUp: 5 });
    await tracker.afterFullTextBatch(async () => 40);
    expect(statuses).toEqual([]);
    expect(tracker.activity).toEqual({ catchUp: { done: 0, total: 8 }, fullText: { done: 0, total: 40 } });
  });

  test('a rebuild ends once the recount finds none, while catch-up goes on', async () => {
    const { tracker, count, countingPass } = await setup(600);
    count.mockResolvedValue(backlog(0));
    countingPass();
    await tracker.afterPass({ drained: false, catchUp: 20 });
    expect(tracker.current).toEqual({ phase: 'idle', done: 0, total: 0 });
    expect(tracker.activity).toEqual({ catchUp: { done: 0, total: 20 } });
  });

  test('a drained pass ends the rebuild and catch-up without counting', async () => {
    const { tracker, count, countingPass } = await setup(600);
    count.mockResolvedValue(backlog(300));
    countingPass();
    await tracker.afterPass({ drained: false, catchUp: 5 });
    count.mockClear();
    await tracker.afterPass({ drained: true });
    expect(count).not.toHaveBeenCalled();
    expect(tracker.current.phase).toBe('idle');
    expect(tracker.activity).toEqual({});
  });

  test('a failed count leaves progress as it was', async () => {
    const tracker = new IndexStatusTracker();
    tracker.setMigrating(1, 1);
    await tracker.opened(() => Promise.reject(new Error('database is locked')));
    expect(tracker.current.phase).toBe('idle');

    const statuses: DataService.IndexStatus[] = [];
    tracker.updated.on((status) => {
      statuses.push(status);
    });
    now += BACKLOG_RECOUNT_INTERVAL;
    tracker.beginPass();
    await tracker.afterPass({ drained: false, catchUp: 5 });
    await tracker.afterFullTextBatch(() => Promise.reject(new Error('database is locked')));
    expect(statuses).toEqual([]);
    expect(tracker.activity).toEqual({ catchUp: { done: 0, total: 5 } });
  });

  test('full-text work recounts at most once an interval, across flushes, and its lane ends with each', async () => {
    const { tracker } = await setup(0);
    const count = vi.fn(async () => 40);
    await tracker.afterFullTextBatch(count);
    await tracker.afterFullTextBatch(count);
    tracker.fullTextEnded();
    expect(tracker.activity).toEqual({});
    await tracker.afterFullTextBatch(count);
    expect(count).toHaveBeenCalledTimes(1);
    now += BACKLOG_RECOUNT_INTERVAL;
    await tracker.afterFullTextBatch(count);
    expect(count).toHaveBeenCalledTimes(2);
  });
});

describe('countIndexBacklog', () => {
  test('feed blocks stored before the pin stay a rebuild until read, later ones are catch-up, and only the spaces of the host count', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
    });
    const spaceId = SpaceId.random();
    const feedId = EntityId.random();
    const run = RuntimeProvider.runPromise(runtime);
    const append = (count: number) =>
      run(
        host.feedStore.appendLocal(
          Array.from({ length: count }, () => ({
            spaceId,
            feedId,
            feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
            data: EchoFeedCodec.encode({ id: EntityId.random() }),
          })),
        ),
      );

    await append(50);
    const read = await run(readFeedPin());
    await append(70);
    const pin = await run(readFeedPin());
    expect(await run(countIndexBacklog({ pin, spaceIds: [spaceId] }))).toEqual({
      documents: 0,
      blocks: 120,
      catchUp: 0,
    });
    expect(await run(countIndexBacklog({ pin, spaceIds: [SpaceId.random()] }))).toEqual({
      documents: 0,
      blocks: 0,
      catchUp: 0,
    });

    await run(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const indexName of IndexEngine.primaryIndexNames) {
          yield* sql`INSERT INTO indexCursor (indexName, spaceId, sourceName, resourceId, cursor)
            VALUES (${indexName}, ${spaceId}, 'queue', ${FeedProtocol.WellKnownNamespaces.trace}, ${`token|${read}`})`;
        }
      }),
    );
    await append(5);
    expect(await run(countIndexBacklog({ pin, spaceIds: [spaceId] }))).toEqual({
      documents: 0,
      blocks: 70,
      catchUp: 5,
    });

    const setCursor = (indexName: string, cursor: string | null) =>
      run(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* cursor === null
            ? sql`DELETE FROM indexCursor WHERE indexName = ${indexName} AND sourceName = 'queue'`
            : sql`UPDATE indexCursor SET cursor = ${cursor} WHERE indexName = ${indexName} AND sourceName = 'queue'`;
        }),
      );
    const [first, second] = IndexEngine.primaryIndexNames;
    await setCursor(second, `token|${pin}`);
    expect((await run(countIndexBacklog({ pin, spaceIds: [spaceId] }))).blocks).toBe(70);
    await setCursor(first, null);
    expect((await run(countIndexBacklog({ pin, spaceIds: [spaceId] }))).blocks).toBe(120);
  });
});
