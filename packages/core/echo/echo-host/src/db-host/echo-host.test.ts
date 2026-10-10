//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Query } from '@dxos/echo';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type QueryService } from '@dxos/protocols/rpc';

import { QueryExecutor } from '../query/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost, type EchoHostProps } from './echo-host.ts';

describe('EchoHost.updateIndexes', () => {
  test('runs a pass only when something was saved since the last one', async () => {
    const { host, saveDocs } = await setup();
    const update = vi.spyOn(host.indexEngine, 'update');

    await saveDocs();
    await host.updateIndexes();
    const passes = update.mock.calls.length;
    expect(passes).toBeGreaterThan(0);

    await host.updateIndexes();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBe(passes);

    await saveDocs();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBeGreaterThan(passes);
  });

  // A streaming agent reply writes faster than a pass completes, so no pass ever finds an empty
  // batch; waiting for one hung every feed-scoped one-shot query issued mid-stream until it timed out.
  test('returns once the writes made before the call are indexed, while writes keep arriving', async () => {
    const { host, runtime, spaceId, saveObject } = await setup();
    const written = EntityId.random();
    await saveObject(written);

    // Every pass lands a write before it finishes, for as long as the caller waits: the next pass
    // always has input, as under a stream, without depending on timing.
    let waiting = true;
    const update = host.indexEngine.update.bind(host.indexEngine);
    vi.spyOn(host.indexEngine, 'update').mockImplementation((ctx, source, opts) =>
      update(ctx, source, opts).pipe(
        Effect.tap(() => (waiting ? Effect.promise(() => saveObject(EntityId.random())) : Effect.void)),
      ),
    );

    await host.updateIndexes();
    waiting = false;

    const rows = await RuntimeProvider.runPromise(runtime)(
      host.indexEngine.queryObjectIds({ spaceIds: [spaceId], objectIds: [written] }),
    );
    expect(rows.map((row) => row.objectId)).toEqual([written]);
  });
});

describe('EchoHost trace indexing', () => {
  test('updateIndexes does not wait out the trace throttle', async () => {
    const { host, runtime, spaceId } = await setup();
    await host.updateIndexes();
    const update = vi.spyOn(host.indexEngine, 'update');
    await RuntimeProvider.runPromise(runtime)(
      host.feedStore.appendLocal([
        {
          spaceId,
          feedId: EntityId.random(),
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          data: new Uint8Array([123, 125]),
        },
      ]),
    );
    await host.updateIndexes();
    expect(update).toHaveBeenCalled();
  });
});

describe('EchoHost query service', () => {
  test('a one-shot query stream ends after its first result', async () => {
    const { host, spaceId, saveObject } = await setup();
    await saveObject(EntityId.random());
    await host.updateIndexes();

    const responses = await EffectEx.runPromise(
      Stream.runCollect(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, '1'))),
    );
    expect(responses).toHaveLength(1);
    expect(responses[0].results).toHaveLength(1);
    expect(host.queryService.activeQueryCount).toBe(0);
  });

  test('queries registered together share one snapshot-completeness check', async () => {
    const { host, spaceId } = await setup({ queryExecutor: 'sql' });
    const check = vi.spyOn(host.indexEngine, 'hasCompleteSnapshots');

    await Promise.all(
      ['1', '2', '3'].map((queryId) =>
        EffectEx.runPromise(
          Stream.runCollect(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, queryId))),
        ),
      ),
    );
    expect(check).toHaveBeenCalledTimes(1);
  });

  test('a one-shot id lookup answers while a query batch is still running', async () => {
    const { host, spaceId, saveObject } = await setup();
    const objectId = EntityId.random();
    await saveObject(objectId);
    await host.updateIndexes();

    const batchStarted = new Trigger();
    const releaseBatch = new Trigger();
    onTestFinished(() => {
      releaseBatch.wake();
    });
    const execQuery = QueryExecutor.prototype.execQuery;
    const spy = vi.spyOn(QueryExecutor.prototype, 'execQuery').mockImplementation(async function (this: QueryExecutor) {
      if (this.queryId === 'batch') {
        batchStarted.wake();
        await releaseBatch.wait();
      }
      return execQuery.call(this);
    });
    onTestFinished(() => spy.mockRestore());

    const batch = EffectEx.runPromise(
      Stream.runHead(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, 'batch'))),
    );
    await batchStarted.wait();

    const responses = await asyncTimeout(
      EffectEx.runPromise(
        Stream.runCollect(host.queryService['QueryService.execQuery'](idLookupRequest(spaceId, 'lookup', objectId))),
      ),
      1_000,
    );
    expect(responses.flatMap((response) => response.results ?? []).map((result) => result.id)).toEqual([objectId]);

    releaseBatch.wake();
    await batch;
  });

  test('a one-shot id lookup cancelled before it runs is never executed', async () => {
    const { host, spaceId } = await setup({ queryExecutor: 'sql' });
    const checkStarted = new Trigger();
    const releaseCheck = new Trigger();
    onTestFinished(() => {
      releaseCheck.wake();
    });
    vi.spyOn(host.indexEngine, 'hasCompleteSnapshots').mockImplementation(() =>
      Effect.promise(async () => {
        checkStarted.wake();
        await releaseCheck.wait();
        return true;
      }),
    );
    const executed: string[] = [];
    const execQuery = QueryExecutor.prototype.execQuery;
    const spy = vi.spyOn(QueryExecutor.prototype, 'execQuery').mockImplementation(function (this: QueryExecutor) {
      executed.push(this.queryId);
      return execQuery.call(this);
    });
    onTestFinished(() => spy.mockRestore());

    const lookup = (queryId: string) => host.queryService['QueryService.execQuery'](idLookupRequest(spaceId, queryId));
    const cancelled = Effect.runFork(Stream.runDrain(lookup('cancelled')));
    await checkStarted.wait();
    const answered = EffectEx.runPromise(Stream.runCollect(lookup('answered')));
    await EffectEx.runPromise(Fiber.interrupt(cancelled));
    releaseCheck.wake();
    await answered;

    expect(executed).toEqual(['answered']);
  });
});

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

const oneShotRequest = (spaceId: SpaceId, queryId: string): QueryService.QueryRequest => ({
  queryId,
  reactivity: QueryReactivity.ONE_SHOT,
  query: JSON.stringify(Query.select(Filter.everything()).from([{ _tag: 'space', spaceId }]).ast),
});

const idLookupRequest = (
  spaceId: SpaceId,
  queryId: string,
  objectId: EntityId = EntityId.random(),
): QueryService.QueryRequest => ({
  ...oneShotRequest(spaceId, queryId),
  query: JSON.stringify(Query.select(Filter.id(objectId)).from([{ _tag: 'space', spaceId }]).ast),
});

const setup = async (options: Pick<EchoHostProps, 'queryExecutor'> = {}) => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime, ...options });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();
  const saveDocs = async (count = 1) => {
    for (let i = 0; i < count; i++) {
      await host.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: {},
        links: {},
      });
    }
    await host.flush(Context.default());
  };

  // One document per object, as a stream of writes would produce: each save is a new index input.
  const saveObject = async (objectId: EntityId) => {
    await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title: objectId } }) },
      links: {},
    });
    await host.flush(Context.default());
  };

  return { host, runtime, spaceId, saveDocs, saveObject };
};
