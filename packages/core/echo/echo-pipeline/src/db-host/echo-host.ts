//
// Copyright 2024 DXOS.org
//

import { type AnyDocumentId, type AutomergeUrl, type DocHandle, type DocumentId } from '@automerge/automerge-repo';
import type * as SqlClient from '@effect/sql/SqlClient';

import { DeferredTask, sleep } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import { type DatabaseDirectory, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { IndexEngine } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import type { Echo } from '@dxos/protocols';
import { protoToBuf } from '@dxos/protocols/buf';
import type { SyncQueueRequest } from '@dxos/protocols/proto/dxos/client/services';
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
import { LocalQueueServiceImpl } from './local-queue-service';
import { QueryServiceImpl } from './query-service';
import { QueueDataSource } from './queue-data-source';
import { SpaceStateManager } from './space-state-manager';

export type EchoHostProps = {
  kv: LevelDB;
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
  syncQueue?: (request: SyncQueueRequest) => Promise<void>;
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
  private readonly _queueDataSource: QueueDataSource;

  private _updateIndexes!: DeferredTask;

  private _queuesService: Echo.QueueService;

  private _indexesUpToDate = false;

  constructor({
    kv,
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    runtime,
    assignQueuePositions = false,
    syncQueue,
  }: EchoHostProps) {
    super();

    this._echoDataMonitor = new EchoDataMonitor();
    this._automergeHost = new AutomergeHost({
      db: kv,
      dataMonitor: this._echoDataMonitor,
      peerIdProvider,
      getSpaceKeyByRootDocumentId,
    });

    this._runtime = runtime;
    this._automergeDataSource = new AutomergeDataSource(this._automergeHost);

    this._feedStore = new FeedStore({ assignPositions: assignQueuePositions, localActorId: crypto.randomUUID() });
    this._queueDataSource = new QueueDataSource({
      feedStore: this._feedStore,
      runtime: this._runtime,
      getSpaceIds: () => this._spaceStateManager.spaceIds,
    });
    this._queuesService = protoToBuf<Echo.QueueService>(new LocalQueueServiceImpl(runtime, this._feedStore, syncQueue));

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
      updateIndexes: async () => {
        do {
          await this._updateIndexes.runBlocking();
        } while (!this._indexesUpToDate);
      },
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

  get queuesService(): Echo.QueueService {
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
    await this._automergeHost.open();
    await this._queryService.open(ctx);
    await this._spaceStateManager.open(ctx);

    await RuntimeProvider.runPromise(this._runtime)(this._indexEngine.migrate());
    this._updateIndexes = new DeferredTask(this._ctx, this._runUpdateIndexes);

    await RuntimeProvider.runPromise(this._runtime)(this._feedStore.migrate());
    this._feedStore.onNewBlocks.on(this._ctx, () => {
      this._queryService.invalidateQueries();
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
      this._queryService.invalidateQueries();
      this._updateIndexes.schedule();
    });
    this._updateIndexes.schedule();
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._queryService.close(ctx);
    await this._spaceStateManager.close(ctx);
    await this._automergeHost.close();
  }

  /**
   * Flush all pending writes to the underlying storage.
   */
  async flush(): Promise<void> {
    await this._automergeHost.flush();
  }

  /**
   * Perform any pending index updates.
   */
  async updateIndexes(): Promise<void> {
    do {
      await this._updateIndexes.runBlocking();
    } while (!this._indexesUpToDate);
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    return await this._automergeHost.loadDoc(ctx, documentId, opts);
  }

  async exportDoc(ctx: Context, id: AnyDocumentId): Promise<Uint8Array> {
    return await this._automergeHost.exportDoc(ctx, id);
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
  async createSpaceRoot(spaceKey: PublicKey): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const spaceId = await createIdFromSpaceKey(spaceKey);

    const automergeRoot = await this._automergeHost.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: spaceKey.toHex() },

      // Better to initialize them right away to avoid merge conflicts and data loss that can occur if those maps get created on the fly.
      objects: {},
      links: {},
    });

    await this._automergeHost.flush({ documentIds: [automergeRoot.documentId] });

    return await this.openSpaceRoot(spaceId, automergeRoot.url);
  }

  // TODO(dmaretskyi): Change to document id.
  async openSpaceRoot(spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), automergeUrl, {
      fetchFromNetwork: true,
    });
    await handle.whenReady();

    return this._spaceStateManager.assignRootToSpace(spaceId, handle);
  }

  // TODO(dmaretskyi): Change to document id.
  async closeSpaceRoot(_automergeUrl: AutomergeUrl): Promise<void> {
    todo();
  }

  /**
   * Install data replicator.
   */
  async addReplicator(replicator: AutomergeReplicator): Promise<void> {
    await this._automergeHost.addReplicator(replicator);
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

  private _runUpdateIndexes = async (): Promise<void> => {
    let totalUpdated = 0;
    let totalDone = true;

    {
      performance.mark('indexEngine.update.automerge:start');
      const { updated, done } = await this._indexEngine
        .update(this._automergeDataSource, { spaceId: null, limit: 50 })
        .pipe(RuntimeProvider.runPromise(this._runtime));
      totalUpdated += updated;
      totalDone &&= done;
      performance.measure('Index Automerge', {
        start: 'indexEngine.update.automerge:start',
        detail: {
          devtools: {
            dataType: 'track-entry',
            track: 'Indexing',
            trackGroup: 'ECHO', // Group related tracks together
            color: 'tertiary-dark',
            properties: [['count', updated]],
          },
        },
      });
    }

    {
      performance.mark('indexEngine.update.queue:start');
      const { updated, done } = await this._indexEngine
        .update(this._queueDataSource, { spaceId: null, limit: 50 })
        .pipe(RuntimeProvider.runPromise(this._runtime));
      totalUpdated += updated;
      totalDone &&= done;
      performance.measure('Index Queues', {
        start: 'indexEngine.update.queue:start',
        detail: {
          devtools: {
            dataType: 'track-entry',
            track: 'Indexing',
            trackGroup: 'ECHO',
            color: 'tertiary-dark',
            properties: [['count', updated]],
          },
        },
      });
    }

    log.verbose('indexEngine update completed', { updated: totalUpdated, done: totalDone });
    await sleep(1);
    if (!totalDone) {
      this._indexesUpToDate = false;
      this._updateIndexes!.schedule();
    } else {
      this._indexesUpToDate = true;
    }

    // Invalidate queries after index update completes so queries can see newly indexed data.
    if (totalUpdated > 0) {
      this._queryService.invalidateQueries();
    }
  };
}

export type { EchoDataStats };

export type EchoStatsDiagnostic = {
  loadedDocsCount: number;
  dataStats: EchoDataStats;
};
