//
// Copyright 2024 DXOS.org
//

import {
  type AnyDocumentId,
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { DeferredTask, scheduleTask, sleep } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import {
  DatabaseDirectory,
  EntityStructure,
  SPACE_ROOT_TYPE,
  SpaceDocVersion,
  type SpaceRoot,
  createIdFromSpaceKey,
  isSpaceRoot,
} from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { IndexEngine, type IndexingResult } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import { type DataService, type FeedService } from '@dxos/protocols/rpc';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace } from '@dxos/tracing';

import {
  AutomergeHost,
  type AutomergeReplicator,
  type CreateDocOptions,
  type DocumentLease,
  EchoDataMonitor,
  type EchoDataStats,
  type LoadDocOptions,
  type PeerIdProvider,
  type RootDocumentSpaceKeyProvider,
  deriveCollectionIdFromSpaceId,
} from '../automerge';
import { AutomergeDataSource } from './automerge-data-source';
import { ConvergenceKeyMerger } from './convergence-key-merge';
import { DataServiceImpl } from './data-service';
import { type DatabaseRoot } from './database-root';
import { DeletionResolver } from './deletion';
import { FeedDataSource } from './feed-data-source';
import { hintFromIndexingResult } from './invalidation-hint';
import { LocalFeedServiceImpl } from './local-feed-service';
import { QueryServiceImpl } from './query-service';
import { type SpaceDocumentListUpdatedEvent, type SpaceRootRefs, SpaceStateManager } from './space-state-manager';

/**
 * Documents walked between event-loop yields during a reachability traversal. Bounds how long one
 * pass can hold the worker thread; the walk is best-effort maintenance and never latency-critical.
 */
const CLOSURE_YIELD_INTERVAL = 32;

const AUTOMATIC_GARBAGE_COLLECTION = false;

/**
 * Every path that can start an indexing run. Logged on each run so an idle-churn loop is
 * attributable from `app.log` alone — the counts are otherwise indistinguishable between a
 * data-driven pass and a self-sustaining invalidation cycle.
 */
export type IndexRunReason = 'open' | 'feed-blocks' | 'documents-saved' | 'batch-continuation' | 'rpc-update-indexes';

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
  syncFeed: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;

  /**
   * Callback to read feed sync backlog per namespace.
   */
  getSyncState: (ctx: Context, request: FeedService.GetSyncStateRequest) => Promise<FeedService.GetSyncStateResponse>;
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
export class EchoHostService extends EffectContext.Service<EchoHostService, EchoHost>()('@dxos/echo-host/EchoHost') {}

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
  private readonly _convergenceKeyMerger: ConvergenceKeyMerger;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  private readonly _feedStore: FeedStore;
  private readonly _feedDataSource: FeedDataSource;

  private _updateIndexes!: DeferredTask;

  /**
   * Why the pending index run was scheduled, counted per reason. `DeferredTask` coalesces
   * overlapping `schedule()` calls into one run, so attributing a run needs the full multiset of
   * reasons that accumulated before it started — a single "last caller" field would misattribute
   * every coalesced run.
   */
  private readonly _pendingIndexReasons = new Map<IndexRunReason, number>();

  private _feedService: FeedService.Handlers;

  private _indexesUpToDate = false;

  /** Last known document set per space, to detect what left the directory. */
  private readonly _spaceDocumentIds = new Map<SpaceId, Set<DocumentId>>();

  // Feed sync handlers are wired lazily via `setFeedSyncHandlers` to break the construction-time
  // cycle with the FeedSyncer, which itself depends on `this.feedStore`.
  #syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;
  #getSyncState?: (ctx: Context, request: FeedService.GetSyncStateRequest) => Promise<FeedService.GetSyncStateResponse>;

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

    this._convergenceKeyMerger = new ConvergenceKeyMerger({
      queryByConvergenceKeys: (spaceId, keys) =>
        this._indexEngine.queryByConvergenceKeys(spaceId, keys).pipe(RuntimeProvider.runPromise(this._runtime)),
      queryReferrers: (spaceId, targetId) =>
        this._indexEngine
          .queryReferrers(spaceId, EID.make({ entityId: targetId }))
          .pipe(RuntimeProvider.runPromise(this._runtime)),
      loadDoc: (ctx, documentId, opts) => this._automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId, opts),
      flushDoc: (ctx, documentId) => this._automergeHost.flush(ctx, { documentIds: [documentId] }),
    });

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
   * Automerge document store backing every space.
   */
  get automergeHost(): AutomergeHost {
    return this._automergeHost;
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
      this.#scheduleIndexRun('feed-blocks');
    });

    this._spaceStateManager.spaceDocumentListUpdated.on(this._ctx, (e) => {
      const previous = this._spaceDocumentIds.get(e.spaceId);
      this._spaceDocumentIds.set(e.spaceId, new Set(e.documentIds));

      if (e.previousRootId) {
        void this._automergeHost.clearLocalCollectionState(deriveCollectionIdFromSpaceId(e.spaceId, e.previousRootId));
      }
      void this._automergeHost.updateLocalCollectionState(
        deriveCollectionIdFromSpaceId(e.spaceId, e.spaceRootId),
        e.documentIds,
      );

      // TODO(dmaretskyi): Current algortithm is too expensive.
      if (AUTOMATIC_GARBAGE_COLLECTION) {
        // Documents that left the directory are this peer's share of a garbage-collection pass some
        // peer explicitly ran: the unlink replicates as an ordinary change, and its arrival here is
        // the evidence. Reclaiming them locally is what makes one invocation free disk everywhere,
        // rather than requiring every peer to run collection itself.
        //
        // Safe because a departed document id never comes back: automerge delivers causally, so a
        // link removal is never observed before the create it depends on, and the sole writer of a
        // `links` key (object creation) always writes a freshly created document url. Registering
        // the new collection state first also means no fetch can race the wipe.
        const departed = previous ? this.#departedDocuments(previous, e) : [];
        if (departed.length > 0 || e.previousRootId) {
          this.#scheduleReclaim(e.spaceId, departed, e.previousRootId);
        }
      }
    });
    this._automergeHost.documentsSaved.on(this._ctx, () => {
      this.#scheduleIndexRun('documents-saved');
    });
    this.#scheduleIndexRun('open');
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
      this.#noteIndexRunReason('rpc-update-indexes');
      await this._updateIndexes.runBlocking();
      if (this._ctx.disposed) {
        return;
      }
    } while (!this._indexesUpToDate);
  }

  /**
   * Leases the document and waits for it to be ready. Dispose the lease when done with it.
   *
   * @returns `null` when the document is not available yet (e.g. storage-only load with no local chunks).
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocumentLease<T> | null> {
    return await this._automergeHost.loadDoc<T>(ctx, documentId, opts);
  }

  /** Leases the document without waiting for it to load. Dispose the lease when done with it. */
  acquireDoc<T>(documentId: AnyDocumentId): DocumentLease<T> {
    return this._automergeHost.acquireDoc<T>(documentId);
  }

  async exportDoc(id: AnyDocumentId): Promise<Uint8Array> {
    return await this._automergeHost.exportDoc(id);
  }

  /**
   * Create new persisted document.
   */
  async createDoc<T>(initialValue?: T, opts?: CreateDocOptions): Promise<DocumentLease<T>> {
    return this._automergeHost.createDoc<T>(initialValue, opts);
  }

  /**
   * Create new space root.
   */
  async createSpaceRoot(ctx: Context, spaceKey: PublicKey): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const spaceId = await createIdFromSpaceKey(spaceKey);

    // Released once the root is assigned: `updateSpaceRoot` takes the lease the space keeps.
    using automergeRoot = await this._automergeHost.createDoc<DatabaseDirectory>({
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

  /**
   * Creates a space anchored on an immutable space root document, which carries the credentials
   * document. The id still derives from the space genesis key, exactly as a feed-backed space's
   * does — the root changes where credentials live, not how the space is identified.
   *
   * NOTE: `createSpaceRoot` above creates the DIRECTORY, which predates this naming.
   */
  async createSpaceWithRootDocument(ctx: Context, spaceKey: PublicKey): Promise<CreatedSpace> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const spaceId = await createIdFromSpaceKey(spaceKey);
    // Both released here: the directory's lease is retaken by `updateSpaceRoot`, and the space root
    // document is only written once.
    using rootHandle = await this._automergeHost.createDoc<Partial<SpaceRoot>>({});

    using directoryHandle = await this._automergeHost.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      // spaceKey is deprecated but still written so older clients can resolve the owning space.
      access: { spaceId, spaceKey: spaceKey.toHex() },
      objects: {},
      links: {},
    });

    rootHandle.change((doc: Partial<SpaceRoot>) => {
      doc.type = SPACE_ROOT_TYPE;
      doc.spaceId = spaceId;
      doc.directory = directoryHandle.url;
    });

    await this._automergeHost.flush(ctx, { documentIds: [rootHandle.documentId, directoryHandle.documentId] });

    const directory = await this.updateSpaceRoot(ctx, spaceId, directoryHandle.url);
    await this._spaceStateManager.setSpaceRootRefs(spaceId, {
      spaceRootDocUrl: rootHandle.url,
    });

    return { spaceId, spaceRootUrl: rootHandle.url, directory };
  }

  /**
   * Mints a space root over a legacy space's existing directory, keeping the space id: it was derived
   * from the space key and cannot be reproduced from a document, which is what `spaceKey` derivation
   * records. Idempotent — a space that already has a root keeps it, so a re-run cannot fork the anchor.
   */
  async migrateSpaceToRootDocument(ctx: Context, spaceId: SpaceId): Promise<SpaceRootRefs | undefined> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const existing = this._spaceStateManager.getSpaceRootRefs(spaceId);
    if (existing) {
      return existing;
    }

    // A space whose directory is not assigned yet (an accepted space still catching up) has nothing to
    // anchor; it migrates on a later load rather than failing here.
    const directory = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (!directory) {
      return undefined;
    }

    using rootHandle = await this._automergeHost.createDoc<Partial<SpaceRoot>>({});
    rootHandle.change((doc: Partial<SpaceRoot>) => {
      doc.type = SPACE_ROOT_TYPE;
      doc.spaceId = spaceId;
      doc.directory = directory.url;
    });

    await this._automergeHost.flush(ctx, { documentIds: [rootHandle.documentId] });

    const refs: SpaceRootRefs = { spaceRootDocUrl: rootHandle.url };
    await this._spaceStateManager.setSpaceRootRefs(spaceId, refs);
    return refs;
  }

  /**
   * Links an already-created credentials document from the space root, once. Idempotent — the link is
   * what the per-space source flip keys off, so a second document would fork the chain. The document
   * itself is built a layer up, where credential encoding lives.
   */
  /**
   * Adopts a space root minted elsewhere, so a joining peer records the root the space already has
   * rather than minting a second one over it. Idempotent; the root must name this space.
   */
  async adoptSpaceRoot(ctx: Context, spaceId: SpaceId, spaceRootUrl: AutomergeUrl): Promise<SpaceRootRefs> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const existing = this._spaceStateManager.getSpaceRootRefs(spaceId);
    if (existing) {
      invariant(existing.spaceRootDocUrl === spaceRootUrl, `Space already anchored on another root: ${spaceId}`);
      return existing;
    }

    // Local-only: a caller adopting a root it was merely told about must not block on the network.
    using rootHandle = await this._automergeHost.loadDoc<SpaceRoot>(ctx, spaceRootUrl, { fetchFromNetwork: false });
    const root = rootHandle?.doc();
    invariant(root && isSpaceRoot(root), 'Space root document must load.');
    invariant(root.spaceId === spaceId, `Space root names another space: ${root.spaceId}`);

    // The directory travels with the root, so a peer that has never opened the space gets one here.
    if (!this._spaceStateManager.getRootBySpaceId(spaceId)) {
      await this.updateSpaceRoot(ctx, spaceId, root.directory);
    }

    const refs: SpaceRootRefs = {
      spaceRootDocUrl: spaceRootUrl,
      credentialsDocUrl: root.credentials,
    };
    await this._spaceStateManager.setSpaceRootRefs(spaceId, refs);
    return refs;
  }

  async setCredentialsDocument(ctx: Context, spaceId: SpaceId, credentialsDocUrl: AutomergeUrl): Promise<AutomergeUrl> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const refs = this._spaceStateManager.getSpaceRootRefs(spaceId);
    invariant(refs, `Space has no root document: ${spaceId}`);
    if (refs.credentialsDocUrl) {
      return refs.credentialsDocUrl;
    }

    using rootHandle = await this._automergeHost.loadDoc<SpaceRoot>(ctx, refs.spaceRootDocUrl);
    invariant(rootHandle, 'Space root document must load before linking credentials.');
    rootHandle.change((doc: SpaceRoot) => {
      doc.credentials = credentialsDocUrl;
    });

    await this._automergeHost.flush(ctx, { documentIds: [rootHandle.documentId] });
    await this._spaceStateManager.setSpaceRootRefs(spaceId, { ...refs, credentialsDocUrl });
    return credentialsDocUrl;
  }

  /** References carried by the space root document, or undefined for a space that predates it. */
  getSpaceRootRefs(spaceId: SpaceId): SpaceRootRefs | undefined {
    return this._spaceStateManager.getSpaceRootRefs(spaceId);
  }

  get spaces(): ReadonlyArray<{ spaceId: SpaceId; rootDocUrl: AutomergeUrl }> {
    return this._spaceStateManager.getPersistedSpaces();
  }

  async openSpaceRoot(ctx: Context, spaceId: SpaceId): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const documentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
    invariant(documentId, `Space root document not found for space: ${spaceId}`);
    const url = `automerge:${documentId}` as AutomergeUrl;
    const lease = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, url, {
      fetchFromNetwork: true,
    });
    invariant(lease, 'Space root document must load before assignment.');

    // The lease is handed over: the space's root stays resident for as long as the space is open.
    return this._spaceStateManager.assignRootToSpace(spaceId, lease);
  }

  async updateSpaceRoot(ctx: Context, spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const currentRoot = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (currentRoot && currentRoot.url === automergeUrl) {
      return currentRoot;
    }
    const lease = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, automergeUrl, {
      fetchFromNetwork: true,
    });
    invariant(lease, 'Space root document must load before assignment.');

    // The lease is handed over: the space's root stays resident for as long as the space is open.
    return this._spaceStateManager.assignRootToSpace(spaceId, lease);
  }

  async closeSpace(spaceId: SpaceId): Promise<void> {
    todo();
  }

  async removeSpace(spaceId: SpaceId): Promise<void> {
    this._spaceDocumentIds.delete(spaceId);
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
   * Per-space storage metrics: objects (alive/deleted), automerge documents, feeds, feed blocks,
   * plus what the host is holding in memory. See `docs/GARBAGE_COLLECTION.md`.
   */
  async getSpaceStats(spaceId: SpaceId): Promise<DataService.DatabaseStats> {
    const root = await this.#ensureSpaceRootLoaded(spaceId);
    const documents = this.#collectSpaceDocuments(root);
    const objects = await this.#countSpaceObjects(root, documents);
    const feeds = await this.getAllFeedsForSpace(spaceId);
    const feedBlocks = feeds.reduce((sum, feed) => sum + feed.blocks.length, 0);

    return {
      objects,
      documents: this.#allSpaceDocumentIds(documents).size,
      feeds: feeds.length,
      feedBlocks,
      // Sampled after the walk above, which loads the space root: reading it first would report a
      // residency the call itself then changes.
      loaded: {
        documents: this._automergeHost.loadedDocsCountForSpace(spaceId),
        documentsTotal: this._automergeHost.loadedDocsCount,
        queriesTotal: this._queryService.activeQueryCount,
      },
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
    const root = await this.#ensureSpaceRootLoaded(spaceId);
    const { unlinkedObjects, removedInlineObjects } = await this.#unlinkDeletedObjects(spaceId, root);
    const wipedDocumentIds = await this.#wipeUnreachableDocuments(spaceId, root);

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

  /** Document ids present in the space's previous directory listing but not the current one. */
  #departedDocuments(previous: ReadonlySet<DocumentId>, event: SpaceDocumentListUpdatedEvent): DocumentId[] {
    const current = new Set(event.documentIds);
    return [...previous].filter((documentId) => !current.has(documentId));
  }

  /**
   * Wipes documents that left a space's directory, off the critical path of applying the change
   * that removed them. Failures are logged rather than propagated: reclamation is best-effort
   * maintenance, and a space that fails to reclaim is only still holding disk.
   *
   * A retired root is expanded to its whole closure rather than trusting the departed set. The
   * diff only knows what this peer observed, and the directory listing is debounced — a document
   * linked and then orphaned in quick succession may never have appeared in a listing at all.
   * Walking the retired root makes an epoch deterministic regardless of what was seen.
   *
   * The unlink case has no equivalent anchor and so relies on the diff, which is exact for the
   * case it exists to serve: an unlink replicating in from a peer arrives long after the link it
   * removes, so the document was certainly observed. A document that was never observed is left
   * for the next explicit collection pass, whose orphan scan finds it by reachability.
   */
  #scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: DocumentId): void {
    scheduleTask(this._ctx, async () => {
      try {
        const candidates = new Set(departed);
        if (retiredRoot) {
          for (const documentId of await this.#collectClosure(retiredRoot)) {
            candidates.add(documentId);
          }
        }
        // Nothing to reclaim: return before touching the live directory. Walking it to build a
        // reachable set no candidate would be tested against costs one storage load per document in
        // the space, which on a large space is seconds of thread time for no possible outcome.
        if (candidates.size === 0) {
          return;
        }

        // Re-checked against the live directory: between the event and this task the documents
        // could have been re-linked (a concurrent write merging in), and reachable data is never
        // a collection candidate.
        // An unreadable live directory is unknown reachability, not empty reachability: taking it
        // as empty would make every candidate — including documents a new root carried forward —
        // read as collectable. Skipping only defers, since the explicit pass scans for orphans.
        const root = this._spaceStateManager.getRootBySpaceId(spaceId);
        if (!root || !(await this.#loadFromStorage(root.documentId))) {
          log('reclamation skipped, live space directory unavailable', { spaceId });
          return;
        }
        // Only the candidates' reachability is in question, so the walk stops as soon as every one
        // has been found rather than enumerating the whole space. Proving a candidate *unreachable*
        // still costs a full traversal — that is inherent to reachability — but the common
        // re-link case now exits after a few loads instead of thousands.
        const reachable = await this.#collectClosure(root.documentId, candidates);

        const stale: DocumentId[] = [];
        for (const documentId of candidates) {
          if (reachable.has(documentId)) {
            continue;
          }
          // Same attribution boundary as the explicit pass: never wipe a document that does not
          // positively identify as this space's.
          if (await this.#isOwnedBySpace(spaceId, documentId)) {
            stale.push(documentId);
          }
        }
        if (stale.length === 0) {
          return;
        }

        // Index state first: the indexer enumerates documents from their heads rows and cursors,
        // and a pass landing between the wipe and this cleanup would re-load a document whose
        // bytes are gone — which re-creates it as an empty document and persists it again.
        await RuntimeProvider.runPromise(this._runtime)(
          this._indexEngine.deleteObjects({ spaceId, documentIds: stale, objects: [] }),
        );
        for (const documentId of stale) {
          await this._automergeHost.removeDocument(documentId);
        }
        log.info('reclaimed documents that left the space directory', { spaceId, documents: stale.length });
      } catch (err) {
        if (this._ctx.disposed) {
          return;
        }
        log.warn('automatic reclamation failed', { spaceId, err });
      }
    });
  }

  /**
   * Transitive closure of documents reachable from a document, over object links and branch
   * members. Storage-only: fetching from the network here would re-materialize the very documents
   * being collected. A document that is not on disk terminates the walk.
   */
  async #collectClosure(documentId: DocumentId, stopWhenFound?: ReadonlySet<DocumentId>): Promise<Set<DocumentId>> {
    const visited = new Set<DocumentId>();
    const queue: DocumentId[] = [documentId];
    // When the caller only needs a membership answer, track what is still outstanding so the walk
    // can stop early. An empty set means the caller wants the full closure.
    const outstanding = stopWhenFound ? new Set(stopWhenFound) : undefined;
    let sinceYield = 0;
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      outstanding?.delete(next);
      if (outstanding?.size === 0) {
        break;
      }
      // Every load parses an automerge document on the single worker thread, so a large space would
      // otherwise hold it for seconds and stall the RPCs a booting tab is waiting on.
      if (++sinceYield >= CLOSURE_YIELD_INTERVAL) {
        sinceYield = 0;
        await sleep(0);
        // Throw rather than return what has been walked so far: a truncated traversal is not a
        // closure, and returning it would read as "these documents are unreachable" and wipe live
        // data. `#scheduleReclaim` swallows this once the context is disposed.
        if (this._ctx.disposed) {
          throw new Error('closure traversal aborted: context disposed');
        }
      }
      const doc = await this.#loadFromStorage(next);
      if (!doc) {
        continue;
      }
      for (const url of [
        ...Object.values(doc.links ?? {}).map((link) => link.toString()),
        ...DatabaseDirectory.getAllBranchDocUrls(doc),
      ]) {
        if (isValidAutomergeUrl(url)) {
          queue.push(interpretAsDocumentId(url as AutomergeUrl));
        }
      }
    }
    return visited;
  }

  async #isOwnedBySpace(spaceId: SpaceId, documentId: DocumentId): Promise<boolean> {
    const doc = await this.#loadFromStorage(documentId);
    return doc ? (await DatabaseDirectory.getSpaceId(doc)) === spaceId : false;
  }

  async #loadFromStorage(documentId: DocumentId): Promise<DatabaseDirectory | null> {
    try {
      using lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      return lease?.doc() ?? null;
    } catch (err) {
      log.warn('reclamation: document failed to load, treating as opaque', { documentId, err });
      return null;
    }
  }

  /** Enumerate the documents reachable from a space root (root + object links + branch members). */
  #collectSpaceDocuments(root: DatabaseRoot): SpaceDocumentSet {
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
  #allSpaceDocumentIds(docs: SpaceDocumentSet): Set<DocumentId> {
    return new Set<DocumentId>([docs.rootDocumentId, ...docs.linkedDocumentIds, ...docs.branchDocumentIds]);
  }

  /**
   * Count live/soft-deleted objects across the root and every object-bearing linked document.
   * Branch documents are skipped to avoid double-counting an object across its branches.
   */
  async #countSpaceObjects(root: DatabaseRoot, docs: SpaceDocumentSet): Promise<{ alive: number; deleted: number }> {
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
      using lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = lease?.doc();
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
  async #unlinkDeletedObjects(
    spaceId: SpaceId,
    root: DatabaseRoot,
  ): Promise<{ unlinkedObjects: number; removedInlineObjects: { documentId: string; objectId: string }[] }> {
    const rootDoc = root.doc();
    if (!rootDoc) {
      return { unlinkedObjects: 0, removedInlineObjects: [] };
    }

    // Every entity in the directory is registered before anything is judged: deletion cascades
    // through parents and relation endpoints, which routinely live in a different document than
    // the object they condemn.
    const deletion = new DeletionResolver(spaceId);
    deletion.add(rootDoc.objects);
    const linkedDocs = new Map<string, DatabaseDirectory>();
    for (const [objectId, url] of Object.entries(rootDoc.links ?? {})) {
      const documentId = interpretAsDocumentId(url.toString() as AutomergeUrl);
      using lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = lease?.doc();
      if (!doc) {
        // A storage-only miss is ambiguous: the document may be genuinely gone, or it may be live
        // data this host has not replicated yet. Retain the link — unlinking here would sync the
        // removal and make a live object unreachable. Only a loaded, confirmed-deleted object is
        // unlinked below.
        continue;
      }
      linkedDocs.set(objectId, doc);
      deletion.add(doc.objects);
    }

    const deletedInlineIds = Object.keys(rootDoc.objects ?? {}).filter((id) => deletion.isDeleted(id));

    const deletedLinkIds: string[] = [];
    for (const [objectId] of linkedDocs) {
      if (deletion.has(objectId) && deletion.isDeleted(objectId)) {
        deletedLinkIds.push(objectId);
      }
    }

    if (deletedInlineIds.length === 0 && deletedLinkIds.length === 0) {
      return { unlinkedObjects: 0, removedInlineObjects: [] };
    }

    root.change((draft: DatabaseDirectory) => {
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
  async #wipeUnreachableDocuments(spaceId: SpaceId, root: DatabaseRoot): Promise<DocumentId[]> {
    const reachable = this.#allSpaceDocumentIds(this.#collectSpaceDocuments(root));
    const wipedDocumentIds: DocumentId[] = [];
    for await (const { documentId } of this._automergeHost.listDocumentHeads()) {
      if (reachable.has(documentId)) {
        continue;
      }
      using lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId, {
        fetchFromNetwork: false,
      });
      const doc = lease?.doc();
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
  async #ensureSpaceRootLoaded(spaceId: SpaceId): Promise<DatabaseRoot> {
    const existing = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (existing?.isLoaded) {
      return existing;
    }
    return this.openSpaceRoot(this._ctx, spaceId);
  }

  /** Records why a run is wanted without scheduling it — for callers that drive the task directly. */
  #noteIndexRunReason(reason: IndexRunReason): void {
    this._pendingIndexReasons.set(reason, (this._pendingIndexReasons.get(reason) ?? 0) + 1);
  }

  #scheduleIndexRun(reason: IndexRunReason): void {
    this.#noteIndexRunReason(reason);
    this._updateIndexes.schedule();
  }

  /** Drains the pending reasons so each run reports only the requests that produced it. */
  #takeIndexRunReasons(): Record<string, number> {
    const reasons = Object.fromEntries(this._pendingIndexReasons);
    this._pendingIndexReasons.clear();
    return reasons;
  }

  private _runUpdateIndexes = async (): Promise<void> => {
    if (this._ctx.disposed || !this.isOpen) {
      // Signal the `updateIndexes` RPC handler's `do-while` loop to exit
      // cooperatively. Without this, the loop sees `_indexesUpToDate === false`
      // and calls `runBlocking` again, which throws on the disposed context.
      this._indexesUpToDate = true;
      return;
    }

    const reasons = this.#takeIndexRunReasons();
    const startedAt = performance.now();

    try {
      const combinedResult = _makeEmptyMergedResult();

      {
        performance.mark('indexEngine.update.automerge:start');
        const result = await this._indexEngine
          .update(this._ctx, this._automergeDataSource, { spaceId: null, limit: 50 })
          .pipe(RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);

        // Convergence-key duplicates are born from replication, and a replicated write is exactly what
        // was just indexed — so this is the earliest a duplicate can be detected on this device.
        // The trigger is the durable intent log written in the same transaction as the index
        // cursors: a crash or a faulted merge pass leaves the intents in place, and this pass —
        // which also runs once at every startup — retries them, so no detected duplicate is ever
        // silently dropped. The merge's own writes land back here via `documentsSaved`, which
        // re-indexes the tombstones; idempotence is what makes that follow-up pass a no-op.
        const { maxId, intents } = await this._indexEngine
          .takeConvergenceKeyIntents()
          .pipe(RuntimeProvider.runPromise(this._runtime));
        if (intents.size > 0) {
          log('servicing convergence-key intents', {
            spaces: intents.size,
            keys: [...intents.values()].reduce((count, keys) => count + keys.size, 0),
            upToId: maxId,
          });
          const { serviced } = await this._convergenceKeyMerger.mergeDuplicates(this._ctx, intents);
          let cleared = 0;
          for (const [spaceId, keys] of serviced) {
            for (const key of keys) {
              await this._indexEngine
                .clearConvergenceKeyIntents(spaceId, key, maxId)
                .pipe(RuntimeProvider.runPromise(this._runtime));
              cleared++;
            }
          }
          log('cleared serviced convergence-key intents', { cleared, upToId: maxId });
        }
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

      const hint = hintFromIndexingResult(combinedResult);
      log.verbose('indexEngine update completed', {
        reasons,
        durationMs: performance.now() - startedAt,
        // A run that indexed nothing yet still invalidates queries is the signature of a
        // self-sustaining invalidation loop, so record whether this run re-armed its own trigger.
        invalidates: !!hint,
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
        this.#scheduleIndexRun('batch-continuation');
      } else {
        this._indexesUpToDate = true;
      }
      // Invalidate queries after index update — the indexer is the sole invalidation source.
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

/** A space created from a space root document, before any credentials exist for it. */
export type CreatedSpace = {
  spaceId: SpaceId;

  /** Automerge URL of the immutable root; goes into the `SpaceMember` credential as `spaceRootUrl`. */
  spaceRootUrl: AutomergeUrl;

  directory: DatabaseRoot;
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
