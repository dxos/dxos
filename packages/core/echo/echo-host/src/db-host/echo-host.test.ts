//
// Copyright 2026 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as SqlClient from 'effect/sql/SqlClient';
import * as SqlError from 'effect/sql/SqlError';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Query } from '@dxos/echo';
import { type DatabaseDirectory, EchoFeedCodec, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { DXN, EntityId, PublicKey, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type DataService, type QueryService } from '@dxos/protocols/rpc';

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

describe('EchoHost index status', () => {
  test('reports migrations while it applies them, then idle', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new EchoHost({ runtime });
    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
    });

    const migrating = statuses.filter((status) => status.phase === 'migrating');
    expect(migrating[0]).toMatchObject({ done: 0 });
    expect(migrating.at(-1)?.done).toBe(migrating[0].total);
    expect(host.indexStatus.current.phase).toBe('idle');
  });

  test('reports a rebuild after the snapshot cursors are reset, and idle once it drains', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const spaceId = SpaceId.random();
    const first = new EchoHost({ runtime });
    await first.open(Context.default());
    for (let i = 0; i < 3; i++) {
      await first.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: { [EntityId.random()]: EntityStructure.makeObject({ type: TEST_TYPE, data: {} }) },
        links: {},
      });
    }
    await RuntimeProvider.runPromise(runtime)(
      first.feedStore.appendLocal([
        {
          spaceId,
          feedId: EntityId.random(),
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          data: new Uint8Array([123, 125]),
        },
      ]),
    );
    await first.flush(Context.default());
    await first.updateIndexes();
    expect(first.indexStatus.current.phase).toBe('idle');
    await first.close();

    // As a cursor-resetting migration leaves the index on the next boot.
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM indexCursor WHERE indexName = 'objectSnapshot'`;
      }),
    );

    const host = new EchoHost({ runtime });
    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
    });
    const documents = 3 + 1; // The objects' documents plus the space root.
    expect(statuses.find((status) => status.phase === 'indexing')).toMatchObject({ done: 0 });
    expect(statuses.find((status) => status.phase === 'indexing')?.total).toBeGreaterThanOrEqual(documents);

    await host.updateIndexes();
    await expect.poll(() => host.indexStatus.current.phase).toBe('idle');
  });

  test('reports catch-up on indexed documents whose heads moved on, without leaving idle', async () => {
    const { host, saveObject } = await setup();
    // Enough for three passes of 50.
    const objectIds = Array.from({ length: 110 }, () => EntityId.random());
    const handles = [];
    for (const objectId of objectIds) {
      handles.push(await saveObject(objectId));
    }
    await host.updateIndexes();

    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    handles.forEach((handle, index) =>
      handle.change((doc) => {
        doc.objects![objectIds[index]].data.title = 'edited';
      }),
    );
    await host.flush(Context.default());
    await host.updateIndexes();

    expect(statuses.map((status) => status.catchUp)).toEqual([
      { done: 0, total: 60 },
      { done: 50, total: 60 },
      undefined,
    ]);
    expect(statuses.every((status) => status.phase === 'idle')).toBe(true);
  });

  test('reports feed blocks past their cursor as catch-up when it opens', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const first = new EchoHost({ runtime });
    await first.open(Context.default());
    // A space root, so the indexer reads the space's feeds, holding an object, so the index keeps a cursor for it.
    const root = await first.createSpaceRoot(Context.default(), PublicKey.random());
    root.change((doc) => {
      doc.objects![EntityId.random()] = EntityStructure.makeObject({ type: TEST_TYPE, data: {} });
    });
    const spaceId = root.doc()!.access!.spaceId!;
    const appendTrace = (count: number) =>
      RuntimeProvider.runPromise(runtime)(
        first.feedStore.appendLocal(
          Array.from({ length: count }, () => ({
            spaceId,
            feedId: EntityId.random(),
            feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
            data: EchoFeedCodec.encode({ id: EntityId.random() }),
          })),
        ),
      );
    await appendTrace(1);
    await first.flush(Context.default());
    await first.updateIndexes();
    await first.close();
    // As blocks that synced after the last pass leave the feed on the next boot.
    await appendTrace(3);

    const host = new EchoHost({ runtime });
    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
    });
    expect(statuses[0]).toEqual({ phase: 'idle', done: 0, total: 0, catchUp: { done: 0, total: 3 } });
    expect(statuses.every((status) => status.phase === 'idle')).toBe(true);
  });

  test('full-text flushes run one at a time, so one run reports the lane', async () => {
    const { host, runtime, saveObjects } = await setup({ indexTransactionLimits: { maxObjects: 4 } });
    await saveObjects(12);
    await host.updateIndexes({ secondaryIndexes: true });
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM indexCursor WHERE sourceName = 'index'`;
      }),
    );

    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    const [first, second] = await Promise.all([host.updateSecondaryIndexes(), host.updateSecondaryIndexes()]);

    expect([first, second]).toEqual([12, 0]);
    expect(statuses.map((status) => status.fullText)).toEqual([
      { done: 0, total: 12 },
      { done: 4, total: 12 },
      { done: 8, total: 12 },
      undefined,
    ]);
  });

  test('a failed full-text flush leaves no full-text lane', async () => {
    const { host, saveObjects } = await setup();
    await saveObjects(3);
    await host.updateIndexes();
    vi.spyOn(host.indexEngine, 'updateSecondaryIndexes').mockReturnValue(Effect.die(new Error('flush failed')));
    await expect(host.updateSecondaryIndexes()).rejects.toThrow('flush failed');
    expect(host.indexStatus.current.fullText).toBeUndefined();
  });

  test('reports a full-text rebuild as it advances, without leaving idle', async () => {
    const { host, runtime, saveObjects } = await setup({ indexTransactionLimits: { maxObjects: 4 } });
    await saveObjects(12);
    await host.updateIndexes({ secondaryIndexes: true });
    // As renaming the full-text index leaves it.
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM indexCursor WHERE sourceName = 'index'`;
      }),
    );

    const statuses: DataService.IndexStatus[] = [];
    host.indexStatus.updated.on((status) => {
      statuses.push(status);
    });
    await host.updateSecondaryIndexes();

    expect(statuses.map((status) => status.fullText)).toEqual([
      { done: 0, total: 12 },
      { done: 4, total: 12 },
      { done: 8, total: 12 },
      undefined,
    ]);
    expect(statuses.every((status) => status.phase === 'idle')).toBe(true);
  });

  test('the data service streams the current status, then each change', async () => {
    const { host } = await setup();
    const received: DataService.IndexStatus[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(host.dataService['DataService.subscribeIndexStatus'](), (status) =>
        Effect.sync(() => received.push(status)),
      ),
    );
    onTestFinished(() => {
      void EffectEx.runPromise(Fiber.interrupt(fiber));
    });

    await expect.poll(() => received).toEqual([{ phase: 'idle', done: 0, total: 0 }]);
    host.indexStatus.opened({ rebuild: 5, catchUp: 0 });
    await expect.poll(() => received.at(-1)).toEqual({ phase: 'indexing', done: 0, total: 5 });
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

  // After an upgrade resets the snapshot cursors, the reindex can run for minutes; a query over a
  // space's objects answers from the snapshot rows already stored instead of waiting it out, even
  // when a feed row elsewhere has no snapshot.
  test('a one-shot query answers from stored snapshots while a cursor reset reindexes', async () => {
    const { host, runtime, spaceId, saveObject, saveObjects } = await setup({ queryExecutor: 'sql' });
    await saveObjects(3);
    await host.updateIndexes();

    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge'`;
        yield* sql`
          INSERT INTO objectMeta (objectId, queueId, queueNamespace, spaceId, entityKind, typeDXN, deleted, version)
          VALUES (${EntityId.random()}, ${EntityId.random()}, 'trace', ${spaceId}, 'object', ${TEST_TYPE.toString()}, 0, 0)
        `;
      }),
    );

    // The reindex never finishes: every pass from here on blocks.
    const releasePasses = new Trigger();
    onTestFinished(() => {
      releasePasses.wake();
    });
    const update = host.indexEngine.update.bind(host.indexEngine);
    vi.spyOn(host.indexEngine, 'update').mockImplementation((ctx, source, opts) =>
      Effect.promise(() => releasePasses.wait()).pipe(Effect.andThen(update(ctx, source, opts))),
    );
    await saveObject(EntityId.random());

    expect(await asyncTimeout(countQueryResults(host, spaceId), 2_000)).toBe(3);
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
    const storedHeads = getHeads(unsavedHandle.doc()!);
    unsavedHandle.change((doc) => {
      doc.objects![unsaved].data.title = 'unsaved';
    });
    const readStoredHeads = host.automergeHost.getStoredHeads.bind(host.automergeHost);
    vi.spyOn(host.automergeHost, 'getStoredHeads').mockImplementation(async (documentIds) =>
      (await readStoredHeads(documentIds)).map((heads, index) =>
        documentIds[index] === unsavedHandle.documentId ? storedHeads : heads,
      ),
    );

    const [response] = await EffectEx.runPromise(
      Stream.runCollect(host.queryService['QueryService.execQuery'](oneShotRequest(spaceId, EntityId.random()))),
    );
    const row = (id: EntityId) => response?.results?.find((result) => result.id === id);
    expect(row(saved)?.heads).toEqual(getHeads(savedHandle.doc()!));
    expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);
    expect(row(saved)?.bytes).toBeDefined();
    expect(row(unsaved)?.heads).toBeUndefined();
    expect(row(unsaved)?.bytes).toBeUndefined();
  });

  test.each([
    {
      read: 'index JSON',
      fail: (host: EchoHost) =>
        vi.spyOn(host.indexEngine, 'queryBackings').mockReturnValueOnce(
          Effect.fail(
            new SqlError.SqlError({
              reason: new SqlError.UnknownError({ cause: undefined, message: 'database is locked' }),
            }),
          ),
        ),
    },
    {
      read: 'stored changes',
      fail: (host: EchoHost) =>
        vi.spyOn(host.automergeHost, 'readStoredChanges').mockRejectedValueOnce(new Error('disk busy')),
    },
  ])('a row whose $read read failed is backed on the next emission', async ({ fail }) => {
    const { host, spaceId, saveObject } = await setup({ queryExecutor: 'sql' });
    const first = EntityId.random();
    await saveObject(first);
    await host.updateIndexes();
    fail(host);

    const emissions: QueryService.QueryResponse[] = [];
    let added: EntityId | undefined;
    const firstEmission = new Trigger();
    const done = EffectEx.runPromise(
      host.queryService['QueryService.execQuery']({
        queryId: 'retry',
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
    added = EntityId.random();
    await saveObject(added);
    await host.updateIndexes();
    await asyncTimeout(done, 5_000);

    const row = (response: QueryService.QueryResponse) => response.results?.find((result) => result.id === first);
    expect(row(emissions[0])?.bytes).toBeUndefined();
    expect(row(emissions.at(-1)!)?.bytes).toBeDefined();
  });

  test('a row ships without JSON or stored changes once a subscription of the client holds its document', async () => {
    const { host, spaceId, saveObject } = await setup({ queryExecutor: 'sql' });
    const held = EntityId.random();
    const heldHandle = await saveObject(held);
    await host.updateIndexes();

    const subscriptionId = 'client';
    const registered = new Trigger();
    const subscription = Effect.runFork(
      host.dataService['DataService.subscribe']({ subscriptionId, spaceId }).pipe(
        Stream.runForEach(() => Effect.sync(() => registered.wake())),
      ),
    );
    onTestFinished(() => EffectEx.runPromise(Fiber.interrupt(subscription)));
    await registered.wait({ timeout: 5_000 });

    const emissions: QueryService.QueryResponse[] = [];
    const firstEmission = new Trigger();
    let added: EntityId | undefined;
    const done = EffectEx.runPromise(
      host.queryService['QueryService.execQuery']({
        queryId: 'held',
        reactivity: QueryReactivity.REACTIVE,
        query: JSON.stringify(Query.select(Filter.everything()).from([{ _tag: 'space', spaceId }]).ast),
        subscriptionIds: [subscriptionId],
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
    await EffectEx.runPromise(
      host.dataService['DataService.updateSubscription']({
        subscriptionId,
        add: [{ id: heldHandle.documentId, heads: getHeads(heldHandle.doc()!), passive: true }],
      }),
    );
    added = EntityId.random();
    await saveObject(added);
    await host.updateIndexes();
    await asyncTimeout(done, 5_000);

    const row = (response: QueryService.QueryResponse, id: EntityId) => response.results?.find((r) => r.id === id);
    const last = emissions.at(-1)!;
    expect(row(emissions[0], held)?.bytes).toBeDefined();
    expect(row(last, held)).toBeDefined();
    expect(row(last, held)?.documentJson).toBeUndefined();
    expect(row(last, held)?.bytes).toBeUndefined();
    expect(row(last, added)?.bytes).toBeDefined();
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
