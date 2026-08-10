//
// Copyright 2024 DXOS.org
//

import {
  type AnyDocumentId,
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DeferredTask, sleep } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import { DatabaseDirectory, EntityStructure, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
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
  SyncFeedRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type DataService, type FeedService } from '@dxos/protocols/rpc';
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
import { LocalFeedServiceImpl } from './local-feed-service';
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
   * Enable Subduction sedimentree transport for Automerge document replication.
   * @default false
   */
  useSubduction?: boolean;
};

/**
 * Feed sync handlers wired after construction to break the EchoHost <-> FeedSyncer cycle.
 */
export type FeedSyncHandlers = {
  /**
   * Callback to run blocking feed sync.
   */
  syncFeed: (ctx: Context, request: SyncFeedRequest) => Promise<void>;

  /**
   * Callback to read feed sync backlog per namespace.
   */
  getSyncState: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;
};

/**
 * The automerge documents that make up a space directory. Used by storage metrics and garbage
 * collection to enumerate and attribute a space's documents.
 */
type SpaceDocumentSet = {
  /** The space root document id. */
  rootDocumentId: DocumentId;
  /** Document ids that embed objects (root inlined objects live in the root document itself). */
  linkedDocumentIds: DocumentId[];
  /** Branch member document ids (occupy storage but are not object-link targets). */
  branchDocumentIds: DocumentId[];
};

/**
 * Effect service tag for {@link EchoHost}.
 */
export class EchoHostService extends EffectContext.Tag('@dxos/echo-host/EchoHost')<EchoHostService, EchoHost>() {}

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
  private readonly _spaceStateManager: SpaceStateManager;
  private readonly _echoDataMonitor: EchoDataMonitor;

  private readonly _automergeDataSource: AutomergeDataSource;
  private readonly _indexEngine: IndexEngine;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  private readonly _feedStore: FeedStore;
  private readonly _feedDataSource: FeedDataSource;

  private _updateIndexes!: DeferredTask;

  private _feedService: FeedService.Handlers;

  private _indexesUpToDate = false;

  // Feed sync handlers are wired lazily via `setFeedSyncHandlers` to break the construction-time
  // cycle with the FeedSyncer, which itself depends on `this.feedStore`.
  #syncFeed?: (ctx: Context, request: SyncFeedRequest) => Promise<void>;
  #getSyncState?: (ctx: Context, request: GetSyncStateRequest) => Promise<GetSyncStateResponse>;

  constructor({
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    runtime,
    assignQueuePositions = false,
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
    this._spaceStateManager = new SpaceStateManager({ runtime });
    this._automergeDataSource = new AutomergeDataSource(this._automergeHost);

    this._feedStore = new FeedStore({ assignPositions: assignQueuePositions, localActorId: crypto.randomUUID() });
    this._feedDataSource = new FeedDataSource({
      feedStore: this._feedStore,
      runtime: this._runtime,
      getSpaceIds: () => this._spaceStateManager.spaceIds,
    });
    this._feedService = new LocalFeedServiceImpl(runtime, this._feedStore, {
      // Read the mutable slots lazily so handlers wired after construction take effect;
      // fall back to no-op / empty state before they are set.
      syncFeed: (ctx, request) => this.#syncFeed?.(ctx, request) ?? Promise.resolve(),
      getSyncState: (ctx, request) => this.#getSyncState?.(ctx, request) ?? Promise.resolve({ namespaces: [] }),
    });

    // SQLite-based index engine for all queries.
    this._indexEngine = new IndexEngine();

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexEngine: this._indexEngine,
      runtime: this._runtime,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and cooperative loop apply.
      updateIndexes: () => this.updateIndexes(),
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and
      // cooperative loop apply uniformly to the RPC handler path.
      updateIndexes: () => this.updateIndexes(),
      getSpaceStats: (spaceId) => this.getSpaceStats(spaceId),
      runGarbageCollection: (spaceId, options) => this.runGarbageCollection(spaceId, options),
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

  get feedService(): FeedService.Handlers {
    return this._feedService;
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._spaceStateManager.roots;
  }

  get feedStore(): FeedStore {
    return this._feedStore;
  }

  /**
   * Wires the feed sync handlers after the composing stack is fully constructed.
   */
  setFeedSyncHandlers(handlers: FeedSyncHandlers): void {
    this.#syncFeed = handlers.syncFeed;
    this.#getSyncState = handlers.getSyncState;
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
   * `Resource` methods in this codebase (e.g. `SqliteStorageAdapter.load`)
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
      // spaceKey is deprecated but still written so older clients can resolve the owning space.
      access: { spaceId, spaceKey: spaceKey.toHex() },

      // Better to initialize them right away to avoid merge conflicts and data loss that can occur if those maps get created on the fly.
      objects: {},
      links: {},
    });

    await this._automergeHost.flush(ctx, { documentIds: [automergeRoot.documentId] });

    return await this.updateSpaceRoot(ctx, spaceId, automergeRoot.url);
  }

  get spaces(): ReadonlyArray<{ spaceId: SpaceId; rootDocUrl: AutomergeUrl }> {
    return this._spaceStateManager.getPersistedSpaces();
  }

  async openSpaceRoot(ctx: Context, spaceId: SpaceId): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const documentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
    invariant(documentId, `Space root document not found for space: ${spaceId}`);
    const url = `automerge:${documentId}` as AutomergeUrl;
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, url, {
      fetchFromNetwork: true,
    });
    invariant(handle, 'Space root document must load before assignment.');
    const query = this._automergeHost.findWithProgress<DatabaseDirectory>(handle.documentId);

    return this._spaceStateManager.assignRootToSpace(spaceId, query);
  }

  async updateSpaceRoot(ctx: Context, spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const currentRoot = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (currentRoot && currentRoot.url === automergeUrl) {
      return currentRoot;
    }
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, automergeUrl, {
      fetchFromNetwork: true,
    });
    invariant(handle, 'Space root document must load before assignment.');
    const query = this._automergeHost.findWithProgress<DatabaseDirectory>(handle.documentId);

    return this._spaceStateManager.assignRootToSpace(spaceId, query);
  }

  async closeSpace(spaceId: SpaceId): Promise<void> {
    todo();
  }

  async removeSpace(spaceId: SpaceId): Promise<void> {
    const root = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (root) {
      void this._automergeHost.clearLocalCollectionState(deriveCollectionIdFromSpaceId(spaceId, root.documentId));
    }
    await this._spaceStateManager.removeSpace(spaceId);
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

  /**
   * Per-space storage metrics: objects (alive/deleted), automerge documents, feeds, feed blocks.
   * See `docs/GARBAGE_COLLECTION.md`.
   */
  async getSpaceStats(spaceId: SpaceId): Promise<DataService.DatabaseStats> {
    const root = await this._ensureSpaceRootLoaded(spaceId);
    const documents = this._collectSpaceDocuments(root);
    const objects = await this._countSpaceObjects(root, documents);
    const feeds = await this.getAllFeedsForSpace(spaceId);
    const feedBlocks = feeds.reduce((sum, feed) => sum + feed.blocks.length, 0);

    return {
      objects,
      documents: this._allSpaceDocumentIds(documents).size,
      feeds: feeds.length,
      feedBlocks,
    };
  }

  /**
   * Reclaim storage held by soft-deleted objects and unreachable documents for a space.
   * See `docs/GARBAGE_COLLECTION.md` for the full algorithm and its safety invariants: unlink
   * soft-deleted objects from the space directory (step 1), wipe every document owned by the space
   * that is no longer reachable from the post-unlink directory (step 2), then drop the reclaimed
   * documents' index rows (step 5).
   */
  async runGarbageCollection(
    spaceId: SpaceId,
    options: DataService.RunGarbageCollectionRequest = { spaceId },
  ): Promise<DataService.GarbageCollectionReport> {
    const root = await this._ensureSpaceRootLoaded(spaceId);
    const { unlinkedObjects, removedInlineObjects } = await this._unlinkDeletedObjects(root);
    const wipedDocumentIds = await this._wipeUnreachableDocuments(spaceId, root);

    let removedIndexEntries = 0;
    if (options.index !== false && (wipedDocumentIds.length > 0 || removedInlineObjects.length > 0)) {
      removedIndexEntries = await RuntimeProvider.runPromise(this._runtime)(
        this._indexEngine.deleteObjects({ spaceId, documentIds: wipedDocumentIds, objects: removedInlineObjects }),
      );
    }

    return {
      unlinkedObjects,
      removedDocuments: wipedDocumentIds.length,
      removedIndexEntries,
      purgedFeedBlocks: 0,
    };
  }

  /** Enumerate the documents reachable from a space root (root + object links + branch members). */
  private _collectSpaceDocuments(root: DatabaseRoot): SpaceDocumentSet {
    const doc = root.doc();
    if (!doc) {
      return { rootDocumentId: root.documentId, linkedDocumentIds: [], branchDocumentIds: [] };
    }

    const linkedDocumentIds = Object.values(doc.links ?? {}).map((url) =>
      interpretAsDocumentId(url.toString() as AutomergeUrl),
    );
    const branchDocumentIds = DatabaseDirectory.getAllBranchDocUrls(doc).map((url) =>
      interpretAsDocumentId(url as AutomergeUrl),
    );

    return { rootDocumentId: root.documentId, linkedDocumentIds, branchDocumentIds };
  }

  /** Distinct set of every document id owned by the space directory. */
  private _allSpaceDocumentIds(docs: SpaceDocumentSet): Set<DocumentId> {
    return new Set<DocumentId>([docs.rootDocumentId, ...docs.linkedDocumentIds, ...docs.branchDocumentIds]);
  }

  /**
   * Count live/soft-deleted objects across the root and every object-bearing linked document.
   * Branch documents are skipped to avoid double-counting an object across its branches.
   */
  private async _countSpaceObjects(
    root: DatabaseRoot,
    docs: SpaceDocumentSet,
  ): Promise<{ alive: number; deleted: number }> {
    const counts = { alive: 0, deleted: 0 };
    const addCounts = (doc: DatabaseDirectory) => {
      for (const object of Object.values(doc.objects ?? {}) as EntityStructure[]) {
        if (EntityStructure.isDeleted(object)) {
          counts.deleted += 1;
        } else {
          counts.alive += 1;
        }
      }
    };

    const rootDoc = root.doc();
    if (rootDoc) {
      addCounts(rootDoc);
    }

    for (const documentId of docs.linkedDocumentIds) {
      // Storage-only: `stats()` is a local metric and must always resolve. A default load would
      // wait on the network for a linked document that is not on disk, hanging `stats()` for an
      // offline space; an unavailable document is simply not counted.
      const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = handle?.doc();
      if (doc) {
        addCounts(doc);
      }
    }

    return counts;
  }

  /**
   * GC step 1: remove soft-deleted objects from the space directory — deleted inlined objects are
   * dropped from the root document; deleted linked objects (and links dangling to a missing
   * document) have their `links` entry removed, orphaning the document for step 2.
   */
  private async _unlinkDeletedObjects(
    root: DatabaseRoot,
  ): Promise<{ unlinkedObjects: number; removedInlineObjects: { documentId: string; objectId: string }[] }> {
    const rootDoc = root.doc();
    if (!rootDoc) {
      return { unlinkedObjects: 0, removedInlineObjects: [] };
    }

    const deletedInlineIds = Object.entries(rootDoc.objects ?? {})
      .filter(([, object]) => EntityStructure.isDeleted(object as EntityStructure))
      .map(([id]) => id);

    const deletedLinkIds: string[] = [];
    for (const [objectId, url] of Object.entries(rootDoc.links ?? {})) {
      const documentId = interpretAsDocumentId(url.toString() as AutomergeUrl);
      const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = handle?.doc();
      if (!doc) {
        // Link points to a document that is not on disk — drop the dangling pointer.
        deletedLinkIds.push(objectId);
        continue;
      }
      const object = doc.objects?.[objectId];
      if (object && EntityStructure.isDeleted(object)) {
        deletedLinkIds.push(objectId);
      }
    }

    if (deletedInlineIds.length === 0 && deletedLinkIds.length === 0) {
      return { unlinkedObjects: 0, removedInlineObjects: [] };
    }

    root.handle.change((draft: DatabaseDirectory) => {
      for (const id of deletedInlineIds) {
        if (draft.objects) {
          delete draft.objects[id];
        }
      }
      for (const id of deletedLinkIds) {
        if (draft.links) {
          delete draft.links[id];
        }
      }
    });

    return {
      unlinkedObjects: deletedInlineIds.length + deletedLinkIds.length,
      removedInlineObjects: deletedInlineIds.map((objectId) => ({ documentId: root.documentId, objectId })),
    };
  }

  /**
   * GC step 2: wipe every document owned by the space that is no longer reachable from the (post
   * step-1) directory. Reachability is recomputed here so just-unlinked documents fall out of the
   * set. Attribution is the safety boundary — a document is wiped only when its `access.spaceId`
   * matches; a document that cannot be loaded (offline) or carries no owner is left untouched.
   */
  private async _wipeUnreachableDocuments(spaceId: SpaceId, root: DatabaseRoot): Promise<DocumentId[]> {
    const reachable = this._allSpaceDocumentIds(this._collectSpaceDocuments(root));
    const wipedDocumentIds: DocumentId[] = [];
    for await (const { documentId } of this._automergeHost.listDocumentHeads()) {
      if (reachable.has(documentId)) {
        continue;
      }
      const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = handle?.doc();
      if (!doc) {
        continue;
      }
      const owner = await DatabaseDirectory.getSpaceId(doc);
      if (owner !== spaceId) {
        continue;
      }
      await this._automergeHost.removeDocument(documentId);
      wipedDocumentIds.push(documentId);
      log('gc: wiped orphaned document', { spaceId, documentId });
    }
    return wipedDocumentIds;
  }

  /** Resolve the space root, opening (and loading) it if it is not already loaded on the host. */
  private async _ensureSpaceRootLoaded(spaceId: SpaceId): Promise<DatabaseRoot> {
    const existing = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (existing?.isLoaded) {
      return existing;
    }
    return this.openSpaceRoot(this._ctx, spaceId);
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

export type EchoHostLayerOptions = Pick<
  EchoHostProps,
  'peerIdProvider' | 'getSpaceKeyByRootDocumentId' | 'assignQueuePositions' | 'useSubduction'
>;

/**
 * Effect Layer constructing a dormant {@link EchoHost}.
 */
export const EchoHostLayer = (
  options: EchoHostLayerOptions = {},
): Layer.Layer<EchoHostService, never, SqlClient.SqlClient | SqlTransaction.SqlTransaction> =>
  Layer.effect(
    EchoHostService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransaction.SqlTransaction>();
      return new EchoHost({ runtime, ...options });
    }),
  );
