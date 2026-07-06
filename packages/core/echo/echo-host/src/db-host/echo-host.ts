//
// Copyright 2024 DXOS.org
//

import { type AnyDocumentId, type AutomergeUrl, type DocHandle, type DocumentId } from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';

import { DeferredTask, sleep } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import { type DatabaseDirectory, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { IndexEngine, type IndexingResult } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { type EntityId, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import type {
  GetSyncStateRequest,
  GetSyncStateResponse,
  SyncQueueRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace } from '@dxos/tracing';

import {
  AutomergeHost,
  type AutomergeReplicator,
  type CreateDocOptions,
  EchoDataMonitor,
  type EchoDataStats,
  type LoadDocOptions,
  type PeerIdProvider,
  type RootDocumentSpaceKeyProvider,
  deriveCollectionIdFromSpaceId,
} from '../automerge';
import { AutomergeDataSource } from './automerge-data-source';
import { DataServiceImpl } from './data-service';
import { type DatabaseRoot } from './database-root';
import { FeedDataSource } from './feed-data-source';
import { hintFromIndexingResult } from './invalidation-hint';
import { LocalQueueServiceImpl } from './local-queue-service';
import { QueryServiceImpl } from './query-service';
import { SpaceStateManager } from './space-state-manager';

export type EchoHostProps = {
  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;

  /**
   * This peer is allowed to assign positions (global-order) to items appended to the queue.
   * @default false
   */
  assignQueuePositions?: boolean;

  /**
   * Callback to run blocking queue sync.
   */
  syncQueue?: (ctx: Context, request: SyncQueueRequest) => Promise<void>;

  /**
   * Callback to read queue sync backlog per namespace.
   */
  getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;

  /**
   * Enable Subduction sedimentree transport for Automerge document replication.
   * @default false
   */
  useSubduction?: boolean;
};

/**
 * Host for the Echo database.
 * Manages multiple spaces.
 * Stores data to disk.
 * Can sync with pluggable data replicators.
 */
export class EchoHost extends Resource {
  private readonly _automergeHost: AutomergeHost;
  private readonly _queryService: QueryServiceImpl;
  private readonly _dataService: DataServiceImpl;
  private readonly _spaceStateManager = new SpaceStateManager();
  private readonly _echoDataMonitor: EchoDataMonitor;

  private readonly _automergeDataSource: AutomergeDataSource;
  private readonly _indexEngine: IndexEngine;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  private readonly _feedStore: FeedStore;
  private readonly _feedDataSource: FeedDataSource;

  private _updateIndexes!: DeferredTask;

  private _queuesService: FeedProtocol.QueueService;

  private _indexesUpToDate = false;

  constructor({
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    runtime,
    assignQueuePositions = false,
    syncQueue,
    getSyncState,
    useSubduction,
  }: EchoHostProps) {
    super();

    this._echoDataMonitor = new EchoDataMonitor();
    this._automergeHost = new AutomergeHost({
      runtime,
      dataMonitor: this._echoDataMonitor,
      peerIdProvider,
      getSpaceKeyByRootDocumentId,
      useSubduction,
    });

    this._runtime = runtime;
    this._automergeDataSource = new AutomergeDataSource(this._automergeHost);

    this._feedStore = new FeedStore({ assignPositions: assignQueuePositions, localActorId: crypto.randomUUID() });
    this._feedDataSource = new FeedDataSource({
      feedStore: this._feedStore,
      runtime: this._runtime,
      getSpaceIds: () => this._spaceStateManager.spaceIds,
    });
    this._queuesService = new LocalQueueServiceImpl(runtime, this._feedStore, { syncQueue, getSyncState });

    // SQLite-based index engine for all queries.
    this._indexEngine = new IndexEngine();

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexEngine: this._indexEngine,
      runtime: this._runtime,
      spaceStateManager: this._spaceStateManager,
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and
      // cooperative loop apply uniformly to the RPC handler path.
      updateIndexes: () => this.updateIndexes(),
    });

    trace.diagnostic<EchoStatsDiagnostic>({
      id: 'echo-stats',
      name: 'Echo Stats',
      fetch: async () => {
        return {
          dataStats: this._echoDataMonitor.computeStats(),
          loadedDocsCount: this._automergeHost.loadedDocsCount,
        };
      },
    });

    trace.diagnostic({
      id: 'database-roots',
      name: 'Database Roots',
      fetch: async () => {
        return Array.from(this._spaceStateManager.roots.values()).map((root) => ({
          url: root.url,
          isLoaded: root.isLoaded,
          spaceKey: root.getSpaceKey(),
          inlineObjects: root.getInlineObjectCount(),
          linkedObjects: root.getLinkedObjectCount(),
        }));
      },
    });

    trace.diagnostic({
      id: 'database-root-metrics',
      name: 'Database Roots (with metrics)',
      fetch: async () => {
        return Array.from(this._spaceStateManager.roots.values()).map((root) => ({
          url: root.url,
          isLoaded: root.isLoaded,
          spaceKey: root.getSpaceKey(),
          inlineObjects: root.getInlineObjectCount(),
          linkedObjects: root.getLinkedObjectCount(),
          ...(root.measureMetrics() ?? {}),
        }));
      },
    });
  }

  get spaceIds(): SpaceId[] {
    return this._spaceStateManager.spaceIds;
  }

  get queryService(): QueryServiceImpl {
    return this._queryService;
  }

  get dataService(): DataServiceImpl {
    return this._dataService;
  }

  get queuesService(): FeedProtocol.QueueService {
    return this._queuesService;
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._spaceStateManager.roots;
  }

  get feedStore(): FeedStore {
    return this._feedStore;
  }

  /**
   * Index engine for queries.
   */
  get indexEngine(): IndexEngine {
    return this._indexEngine;
  }

  protected override async _open(ctx: Context): Promise<void> {
    log('echo-host: running index engine migration...');
    await RuntimeProvider.runPromise(this._runtime)(this._indexEngine.migrate());
    log('echo-host: index engine migration done');
    this._updateIndexes = new DeferredTask(this._ctx, this._runUpdateIndexes);

    log('echo-host: running feed store migration...');
    await RuntimeProvider.runPromise(this._runtime)(this._feedStore.migrate());
    log('echo-host: feed store migration done');

    // AutomergeHost._open() runs its own migrations (automerge_chunks, heads) before
    // constructing the Repo, so table creation is handled there.
    log('echo-host: opening automerge host...');
    await this._automergeHost.open(ctx);
    log('echo-host: automerge host opened');

    log('echo-host: opening query service...');
    await this._queryService.open(ctx);
    log('echo-host: query service opened');

    log('echo-host: opening space state manager...');
    await this._spaceStateManager.open(ctx);
    log('echo-host: space state manager opened');
    this._feedStore.onNewBlocks.on(this._ctx, () => {
      this._updateIndexes.schedule();
    });

    this._spaceStateManager.spaceDocumentListUpdated.on(this._ctx, (e) => {
      if (e.previousRootId) {
        void this._automergeHost.clearLocalCollectionState(deriveCollectionIdFromSpaceId(e.spaceId, e.previousRootId));
      }
      void this._automergeHost.updateLocalCollectionState(
        deriveCollectionIdFromSpaceId(e.spaceId, e.spaceRootId),
        e.documentIds,
      );
    });
    this._automergeHost.documentsSaved.on(this._ctx, () => {
      this._updateIndexes.schedule();
    });
    this._updateIndexes.schedule();
    log('echo-host: open complete');
  }

  protected override async _close(ctx: Context): Promise<void> {
    // Drain any in-flight indexer task before the Resource base disposes
    // `this._ctx`. Without this, an in-flight `DataServiceImpl.updateIndexes`
    // RPC handler's `do { await runBlocking() } while (!_indexesUpToDate)`
    // loop can hit a disposed ctx on its next iteration and throw
    // `ContextDisposedError` — which escapes as an unhandled rejection
    // because the originating client `flush()` is fire-and-forget at the
    // test layer. The cooperative `_indexesUpToDate = true` set inside
    // `_runUpdateIndexes` lets the loop exit cleanly once the current
    // iteration finishes.
    await this._updateIndexes?.join();

    await this._queryService.close(ctx);
    await this._spaceStateManager.close(ctx);
    await this._automergeHost.close();
  }

  /**
   * Flush all pending writes to the underlying storage.
   */
  async flush(ctx: Context): Promise<void> {
    await this._automergeHost.flush(ctx);
  }

  /**
   * Perform any pending index updates.
   *
   * Bails as a no-op when the host has been closed: a late `db.flush()` RPC
   * (client still has an open service ref while the host is in/post-teardown)
   * has nothing to update against. The pre-loop and post-iteration
   * `_ctx.disposed` checks prevent `runBlocking` from being entered against a
   * disposed context — which would throw `ContextDisposedError` and escape as
   * an unhandled rejection at the fire-and-forget originating caller. Other
   * `Resource` methods in this codebase (e.g. `LevelDBStorageAdapter.load`)
   * follow the same closed-host early-out pattern.
   */
  async updateIndexes(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    do {
      await this._updateIndexes.runBlocking();
      if (this._ctx.disposed) {
        return;
      }
    } while (!this._indexesUpToDate);
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   *
   * @returns `null` when the document is not available yet (e.g. storage-only load with no local chunks).
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T> | null> {
    return await this._automergeHost.loadDoc(ctx, documentId, opts);
  }

  async exportDoc(id: AnyDocumentId): Promise<Uint8Array> {
    return await this._automergeHost.exportDoc(id);
  }

  /**
   * Create new persisted document.
   */
  async createDoc<T>(initialValue?: T, opts?: CreateDocOptions): Promise<DocHandle<T>> {
    return this._automergeHost.createDoc(initialValue, opts);
  }

  /**
   * Create new space root.
   */
  async createSpaceRoot(ctx: Context, spaceKey: PublicKey): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const spaceId = await createIdFromSpaceKey(spaceKey);

    const automergeRoot = await this._automergeHost.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: spaceKey.toHex() },

      // Better to initialize them right away to avoid merge conflicts and data loss that can occur if those maps get created on the fly.
      objects: {},
      links: {},
    });

    await this._automergeHost.flush(ctx, { documentIds: [automergeRoot.documentId] });

    return await this.openSpaceRoot(ctx, spaceId, automergeRoot.url);
  }

  // TODO(dmaretskyi): Change to document id.
  async openSpaceRoot(ctx: Context, spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, automergeUrl, {
      fetchFromNetwork: true,
    });
    invariant(handle, 'Space root document must load before assignment.');
    const query = this._automergeHost.findWithProgress<DatabaseDirectory>(handle.documentId);

    return this._spaceStateManager.assignRootToSpace(spaceId, query);
  }

  // TODO(dmaretskyi): Change to document id.
  async closeSpaceRoot(_automergeUrl: AutomergeUrl): Promise<void> {
    todo();
  }

  /**
   * Install data replicator.
   */
  async addReplicator(ctx: Context, replicator: AutomergeReplicator): Promise<void> {
    await this._automergeHost.addReplicator(ctx, replicator);
  }

  /**
   * Remove data replicator.
   */
  async removeReplicator(replicator: AutomergeReplicator): Promise<void> {
    await this._automergeHost.removeReplicator(replicator);
  }

  /**
   * Run collection sync for the given space.
   * Does not wait for the sync to complete.
   */
  async runCollectionSync(spaceId: SpaceId) {
    const root = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (!root) {
      throw new Error(`Space not found: ${spaceId}`);
    }
    this._automergeHost.refreshCollection(deriveCollectionIdFromSpaceId(spaceId, root.documentId));
  }

  /**
   * Get all feeds and their blocks for a space.
   * Used for space archive export.
   */
  async getAllFeedsForSpace(
    spaceId: SpaceId,
  ): Promise<Array<{ feedId: string; feedNamespace: string; blocks: FeedProtocol.Block[] }>> {
    return RuntimeProvider.runPromise(this._runtime)(this._feedStore.getAllFeedsForSpace({ spaceId }));
  }

  private _runUpdateIndexes = async (): Promise<void> => {
    if (this._ctx.disposed || !this.isOpen) {
      // Signal the `updateIndexes` RPC handler's `do-while` loop to exit
      // cooperatively. Without this, the loop sees `_indexesUpToDate === false`
      // and calls `runBlocking` again, which throws on the disposed context.
      this._indexesUpToDate = true;
      return;
    }

    try {
      const combinedResult = _makeEmptyMergedResult();

      {
        performance.mark('indexEngine.update.automerge:start');
        const result = await this._indexEngine
          .update(this._ctx, this._automergeDataSource, { spaceId: null, limit: 50 })
          .pipe(RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);
        performance.measure('Index Automerge', {
          start: 'indexEngine.update.automerge:start',
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'Indexing',
              trackGroup: 'ECHO', // Group related tracks together
              color: 'tertiary-dark',
              properties: [['count', result.updated]],
            },
          },
        });
      }
      if (this._ctx.disposed || !this.isOpen) {
        this._indexesUpToDate = true;
        return;
      }

      {
        performance.mark('indexEngine.update.queue:start');
        const result = await this._indexEngine
          .update(this._ctx, this._feedDataSource, { spaceId: null, limit: 50 })
          .pipe(RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);
        performance.measure('Index Queues', {
          start: 'indexEngine.update.queue:start',
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'Indexing',
              trackGroup: 'ECHO',
              color: 'tertiary-dark',
              properties: [['count', result.updated]],
            },
          },
        });
      }

      log.verbose('indexEngine update completed', {
        updated: combinedResult.updated,
        done: combinedResult.done,
        spaces: combinedResult.spaces.size,
        queues: combinedResult.queues.size,
        documents: combinedResult.documents.size,
        types: combinedResult.types.size,
        objects: combinedResult.objects.size,
      });
      await sleep(1);
      if (!combinedResult.done) {
        this._indexesUpToDate = false;
        this._updateIndexes!.schedule();
      } else {
        this._indexesUpToDate = true;
      }
      // Invalidate queries after index update — the indexer is the sole invalidation source.
      const hint = hintFromIndexingResult(combinedResult);
      if (hint) {
        this._queryService.invalidateQueries(hint);
      }
    } catch (err) {
      if (this._ctx.disposed || !this.isOpen) {
        this._indexesUpToDate = true;
        return;
      }
      log.catch(err);
      // Failsafe: prevent queries from freezing if the indexer faults.
      this._queryService.invalidateQueries();
      throw err;
    }
  };
}

export type { EchoDataStats };

type MutableIndexingAccumulator = {
  updated: number;
  done: boolean;
  spaces: Set<SpaceId>;
  queues: Set<EntityId>;
  documents: Set<string>;
  types: Set<string>;
  objects: Set<EntityId>;
};

const _makeEmptyMergedResult = (): MutableIndexingAccumulator => ({
  updated: 0,
  done: true,
  spaces: new Set(),
  queues: new Set(),
  documents: new Set(),
  types: new Set(),
  objects: new Set(),
});

const _mergeInto = (acc: MutableIndexingAccumulator, r: IndexingResult): void => {
  acc.updated += r.updated;
  acc.done = acc.done && r.done;
  for (const s of r.spaces) {
    acc.spaces.add(s);
  }
  for (const q of r.queues) {
    acc.queues.add(q);
  }
  for (const d of r.documents) {
    acc.documents.add(d);
  }
  for (const t of r.types) {
    acc.types.add(t);
  }
  for (const o of r.objects) {
    acc.objects.add(o);
  }
};

export type EchoStatsDiagnostic = {
  loadedDocsCount: number;
  dataStats: EchoDataStats;
};
