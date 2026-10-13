//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as SqlClient from 'effect/sql/SqlClient';
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

// The worker runs every statement over one SQLite connection, so a query waited out the whole of an
// unbounded index transaction.
describe('EchoHost index transactions', () => {
  test('a query issued during an index pass answers before the pass has written every object', async () => {
    const { host, runtime, spaceId, saveObjects } = await setup({ indexTransactionLimits: { maxObjects: 2 } });
    const sql = await RuntimeProvider.runPromise(runtime)(SqlClient.SqlClient);

    // Armed only while a pass indexes documents, so the storage writes behind a save are ignored.
    let indexing = false;
    const update = host.indexEngine.update.bind(host.indexEngine);
    vi.spyOn(host.indexEngine, 'update').mockImplementation((ctx, source, opts) =>
      Effect.suspend(() => {
        indexing = source.sourceName === 'automerge';
        return update(ctx, source, opts);
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            indexing = false;
          }),
        ),
      ),
    );
    let answer: Promise<number> | undefined;
    const withTransaction = sql.withTransaction;
    vi.spyOn(sql, 'withTransaction').mockImplementation((effect) => {
      if (indexing) {
        answer ??= countQueryResults(host, spaceId);
      }
      return withTransaction(effect);
    });

    await saveObjects(12);
    await host.updateIndexes();

    // The query ran between two of the pass's transactions, so it saw the document partly indexed.
    expect(answer).toBeDefined();
    expect(await answer).toBeLessThan(12);
    const rows = await RuntimeProvider.runPromise(runtime)(host.indexEngine.queryAll({ spaceIds: [spaceId] }));
    expect(rows).toHaveLength(12);
  });

  test('a query issued during full-text catch-up answers before the catch-up finishes', async () => {
    const { host, runtime, spaceId, saveObjects } = await setup({ indexTransactionLimits: { maxObjects: 2 } });
    await saveObjects(12);
    await host.updateIndexes();
    const sql = await RuntimeProvider.runPromise(runtime)(SqlClient.SqlClient);

    const events: string[] = [];
    let answer: Promise<void> | undefined;
    const withTransaction = sql.withTransaction;
    vi.spyOn(sql, 'withTransaction').mockImplementation((effect) => {
      answer ??= countQueryResults(host, spaceId).then(() => {
        events.push('answer');
      });
      return withTransaction(effect).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            events.push('commit');
          }),
        ),
      );
    });

    await host.updateSecondaryIndexes();
    await answer;
    expect(events.indexOf('answer')).toBeGreaterThan(-1);
    expect(events.indexOf('answer')).toBeLessThan(events.lastIndexOf('commit'));
  });
});

describe('EchoHost index-backed rows', () => {
  test('the memory executor backs a row only at heads storage holds', async () => {
    const { host, spaceId, saveObject } = await setup({ queryExecutor: 'memory' });
    const saved = EntityId.random();
    const unsaved = EntityId.random();
    const savedHandle = await saveObject(saved);
    const unsavedHandle = await saveObject(unsaved);
    await host.updateIndexes();
    unsavedHandle.change((doc) => {
      doc.objects![unsaved].data.title = 'unsaved';
    });

    const [response] = await EffectEx.runPromise(
      Stream.runCollect(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, EntityId.random()))),
    );
    const row = (id: EntityId) => response?.results?.find((result) => result.id === id);
    expect(row(saved)?.heads).toEqual(getHeads(savedHandle.doc()!));
    expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);
    expect(row(saved)?.bytes).toBeDefined();
    // Its lease is ahead of storage, so a client could not load the changes the JSON shows.
    expect(row(unsaved)?.heads).toBeUndefined();
    expect(row(unsaved)?.bytes).toBeUndefined();
  });

  test('a re-emit ships JSON and stored changes only for rows at a new version', async () => {
    const { host, spaceId, saveObject } = await setup({ queryExecutor: 'sql' });
    const unchanged = EntityId.random();
    const edited = EntityId.random();
    await saveObject(unchanged);
    const editedHandle = await saveObject(edited);
    await host.updateIndexes();

    const emissions: QueryService.QueryResponse[] = [];
    const firstEmission = new Trigger();
    let added: EntityId | undefined;
    const done = EffectEx.runPromise(
      host.queryService['QueryService.execQuery']({
        queryId: 'lazy',
        reactivity: QueryReactivity.REACTIVE,
        query: JSON.stringify(Query.select(Filter.everything()).from([{ _tag: 'space', spaceId }]).ast),
      }).pipe(
        Stream.tap((response) =>
          Effect.sync(() => {
            emissions.push(response);
            firstEmission.wake();
          }),
        ),
        Stream.takeUntil((response) => response.results?.some((row) => row.id === added) ?? false),
        Stream.runDrain,
      ),
    );
    await firstEmission.wait({ timeout: 5_000 });

    editedHandle.change((doc) => {
      doc.objects![edited].data.title = 'edited';
    });
    await host.flush(Context.default());
    await host.updateIndexes();
    added = EntityId.random();
    await saveObject(added);
    await host.updateIndexes();
    await asyncTimeout(done, 5_000);

    const [initial, ...later] = emissions;
    // An edit alone is not a change of rows, so the one re-emit is the one the new object causes.
    expect(later).toHaveLength(1);
    const row = (response: QueryService.QueryResponse, id: EntityId) => response.results?.find((r) => r.id === id);
    expect(row(initial, unchanged)?.bytes).toBeDefined();
    expect(row(later.at(-1)!, added)?.bytes).toBeDefined();
    // Whichever emission first carries the edited row's new version ships it.
    const editedVersion = row(initial, edited)!.version!;
    expect(
      later.some((response) => {
        const edit = row(response, edited);
        return edit?.bytes !== undefined && edit.version! > editedVersion;
      }),
    ).toBe(true);
    for (const response of later) {
      expect(row(response, unchanged)?.version).toBe(row(initial, unchanged)?.version);
      expect(row(response, unchanged)?.documentJson).toBeUndefined();
      expect(row(response, unchanged)?.bytes).toBeUndefined();
    }
  });
});

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

const countQueryResults = async (host: EchoHost, spaceId: SpaceId): Promise<number> => {
  const responses = await EffectEx.runPromise(
    Stream.runCollect(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, EntityId.random()))),
  );
  return responses[0]?.results?.length ?? 0;
};

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

const setup = async (options: Pick<EchoHostProps, 'indexTransactionLimits' | 'queryExecutor'> = {}) => {
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
    const handle = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title: objectId } }) },
      links: {},
    });
    await host.flush(Context.default());
    return handle;
  };

  // One document holding every object, as a document's first index presents all of them at once.
  const saveObjects = async (count: number) => {
    const objects = Object.fromEntries(
      Array.from({ length: count }, () => {
        const objectId = EntityId.random();
        return [objectId, EntityStructure.makeObject({ type: TEST_TYPE, data: { title: objectId } })];
      }),
    );
    await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects,
      links: {},
    });
    await host.flush(Context.default());
  };

  return { host, runtime, spaceId, saveDocs, saveObject, saveObjects };
};
