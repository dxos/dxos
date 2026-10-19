//
// Copyright 2026 DXOS.org
//

import * as SqlClient from 'effect/sql/SqlClient';
import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { IndexEngine } from '@dxos/index-core';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { FeedDataSource } from './feed-data-source.ts';
import { FeedRetention } from './feed-retention.ts';

/**
 * Reproduces the trace feed of the space dump behind "Trace feed is unbounded": 22,592 messages over
 * 36 days, ~880 B each, 45% `operation.start` and 42% `operation.end`. Run with `DX_TRACE_BENCH=1`;
 * numbers are node SQLite in memory, so read them relative to each other.
 */
describe.skipIf(!process.env.DX_TRACE_BENCH)('trace feed benchmark', () => {
  const MESSAGES = 22_592;
  const DATA_OBJECTS = 2_000;
  const DAY = 24 * 60 * 60_000;
  const SPAN_DAYS = 36;
  const TRACE_TYPE = DXN.make('org.dxos.type.traceMessage', '0.1.0');
  const DATA_TYPE = DXN.make('com.example.type.note', '0.1.0');
  const PADDING = 'x'.repeat(640);

  const eventType = (index: number) => {
    const slot = index % 100;
    return slot < 45 ? 'operation.start' : slot < 87 ? 'operation.end' : 'task.statusChanged';
  };

  const time = async <T>(label: string, run: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await run();
    log.info(label, { ms: Math.round(performance.now() - start) });
    return result;
  };

  test('before and after', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(dispose);
    const run = RuntimeProvider.runPromise(runtime);
    const feedStore = new FeedStore({ localActorId: 'local', assignPositions: false });
    await run(feedStore.migrate());
    const engine = new IndexEngine(await run(SqlClient.SqlClient));
    await run(engine.migrate());

    const spaceId = SpaceId.random();
    const traceFeed = EntityId.random();
    const now = Date.now();
    const blocks = Array.from({ length: MESSAGES }, (_, index) => ({
      feedId: traceFeed,
      actorId: 'remote',
      sequence: index,
      prevActorId: index > 0 ? 'remote' : null,
      prevSequence: index > 0 ? index - 1 : null,
      position: null,
      timestamp: now - SPAN_DAYS * DAY + Math.floor((index / MESSAGES) * SPAN_DAYS * DAY),
      data: EchoFeedCodec.encode({
        'id': EntityId.random(),
        '@type': TRACE_TYPE,
        'meta': { pid: `pid-${index % 400}`, processName: `process-${index % 107}`, space: spaceId },
        'isEphemeral': false,
        'events': [{ type: eventType(index), timestamp: now, data: { key: 'org.dxos.operation', name: PADDING } }],
      }),
    }));
    for (let offset = 0; offset < blocks.length; offset += 1_000) {
      await run(
        feedStore.append({
          requestId: `trace-${offset}`,
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          blocks: blocks.slice(offset, offset + 1_000),
        }),
      );
    }
    await run(
      feedStore.appendLocal(
        Array.from({ length: DATA_OBJECTS }, () => ({
          spaceId,
          feedId: EntityId.random(),
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          data: EchoFeedCodec.encode({ 'id': EntityId.random(), '@type': DATA_TYPE, 'title': 'note' }),
        })),
      ),
    );

    const indexAll = async (feedNamespaces: string[]) => {
      const source = new FeedDataSource({ feedStore, runtime, getSpaceIds: () => [spaceId], feedNamespaces });
      let passes = 0;
      for (let done = false; !done; passes++) {
        // The host indexes feeds 50 blocks a pass.
        done = (await run(engine.update(Context.default(), source, { spaceId: null, limit: 50 }))).done;
      }
      return passes;
    };
    const objectMetaRows = () => run(engine.queryAll({ spaceIds: [spaceId], includeAllQueues: true }));
    const typeQuery = () =>
      run(engine.queryTypes({ spaceIds: [spaceId], typeDxns: [DATA_TYPE], includeAllQueues: true }));
    const readTrace = async () => {
      const { blocks } = await run(
        feedStore.query({
          requestId: 'read',
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          query: { feedIds: [traceFeed] },
        }),
      );
      return blocks.map((block) => EchoFeedCodec.decodeBlock(block)).length;
    };

    // Before: the trace namespace is indexed.
    const passesBefore = await time('before: index everything (passes of 50)', () =>
      indexAll([FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace]),
    );
    log.info('before: index passes', { passes: passesBefore, objectMetaRows: (await objectMetaRows()).length });
    await time('before: space-wide type query over feeds', typeQuery);
    log.info('before: whole trace feed read', { messages: await time('before: read whole trace feed', readTrace) });

    // After: the one-off purge, then only data is indexed.
    const dropped = await time('after: drop trace rows from the index (one-off)', () =>
      run(engine.dropFeedNamespace({ sourceName: 'queue', feedNamespace: FeedProtocol.WellKnownNamespaces.trace })),
    );
    log.info('after: dropped rows', { dropped, objectMetaRows: (await objectMetaRows()).length });
    await time('after: space-wide type query over feeds', typeQuery);

    const retention = new FeedRetention({
      feedStore,
      runtime,
      getSpaceIds: () => [spaceId],
      policies: [
        {
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          maxAgeMs: 7 * DAY,
          shouldPrune: (object) =>
            Array.isArray(object.events) &&
            object.events.every(
              (event: { type?: string }) => event.type === 'operation.start' || event.type === 'operation.end',
            ),
        },
      ],
    });
    const pruned = await time('after: retention, first run (one-off compaction)', () => retention.prune(now));
    const remaining = await run(
      feedStore.countNamespaceBlocks({ spaceId, feedNamespace: FeedProtocol.WellKnownNamespaces.trace }),
    );
    log.info('after: retention', { pruned, remaining });
    log.info('after: retained trace feed read', { messages: await time('after: read retained trace feed', readTrace) });

    const passesAfter = await time('after: index a fresh store (data only, passes of 50)', async () => {
      await run(
        engine.dropFeedNamespace({ sourceName: 'queue', feedNamespace: FeedProtocol.WellKnownNamespaces.data }),
      );
      return indexAll([FeedProtocol.WellKnownNamespaces.data]);
    });
    log.info('after: index passes', { passes: passesAfter, objectMetaRows: (await objectMetaRows()).length });
  }, 600_000);
});
