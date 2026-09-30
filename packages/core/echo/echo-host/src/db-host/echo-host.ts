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

import { DeferredTask, scheduleTask, sleep, synchronized } from '@dxos/async';
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
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { FeedStore } from '@dxos/feed';
import { type EntityMeta, IndexEngine, type IndexingResult } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import { type DataService, type FeedService } from '@dxos/protocols/rpc';
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
} from '../automerge/index.ts';
import { AutomergeDataSource } from './automerge-data-source.ts';
import { ConvergenceKeyMerger } from './convergence-key-merge.ts';
import { DataServiceImpl } from './data-service.ts';
import { type DatabaseRoot } from './database-root.ts';
import { DeletionResolver } from './deletion.ts';
import { FeedDataSource } from './feed-data-source.ts';
import { type InvalidationHint, hintFromIndexingResult, mergeHints } from './invalidation-hint.ts';
import { LocalFeedServiceImpl } from './local-feed-service.ts';
import { QueryServiceImpl } from './query-service.ts';
import { RegistryDataSource, type RegistryEntry } from './registry-data-source.ts';
import { type SpaceDocumentListUpdatedEvent, type SpaceRootRefs, SpaceStateManager } from './space-state-manager.ts';

/**
 * Documents walked between event-loop yields during a reachability traversal. Bounds how long one
 * pass can hold the worker thread; the walk is best-effort maintenance and never latency-critical.
 */
const CLOSURE_YIELD_INTERVAL = 32;

const AUTOMATIC_GARBAGE_COLLECTION = false;

/**
 * Idle window before the second indexing step re-tokenizes what the first one wrote, and the
 * ceiling an unbroken write stream cannot push it past. A typing burst then costs one rebuild
 * rather than one per save; nothing a query reads depends on either number, since text search
 * flushes for itself and every other read comes from the snapshot store.
 */
const FTS_FLUSH_IDLE_MS = 1_000;
const FTS_FLUSH_MAX_DELAY_MS = 10_000;

/**
 * Every path that can start an indexing run. Logged on each run so an idle-churn loop is
 * attributable from `app.log` alone — the counts are otherwise indistinguishable between a
 * data-driven pass and a self-sustaining invalidation cycle.
 */
export type IndexRunReason =
  | 'open'
  | 'feed-blocks'
  | 'documents-saved'
  | 'batch-continuation'
  | 'registry-update'
  | 'rpc-update-indexes'
  | 'feed-scoped-query'
  | 'epoch';

/** Requests that drive the indexer directly, as opposed to the events that schedule it. */
export type IndexRequestReason = Extract<IndexRunReason, 'rpc-update-indexes' | 'feed-scoped-query' | 'epoch'>;

import { type QueryExecutorMode } from '../query/index.ts';

/**
 * Query evaluation path for this host: the explicit option, else `DX_ECHO_QUERY_EXECUTOR`, else the
 * compiled SQL executor. Resolved here, where the option enters, so nothing below reads the
 * environment — the planner and executor take the mode they are given.
 *
 * `memory` remains reachable so a regression can be bisected against the old path without a rebuild,
 * and the planner still falls back to it per query for the shapes the compiler declines.
 */
const resolveQueryExecutorMode = (explicit?: QueryExecutorMode): QueryExecutorMode => {
  if (explicit) {
    return explicit;
  }
  const fromEnv =
    import.meta.env?.DX_ECHO_QUERY_EXECUTOR ??
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DX_ECHO_QUERY_EXECUTOR;
  return fromEnv === 'memory' ? 'memory' : 'sql';
};

export type EchoHostProps = {
  /** Query evaluation path; defaults to `DX_ECHO_QUERY_EXECUTOR`, else the compiled SQL executor. */
  queryExecutor?: QueryExecutorMode;

  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;

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
  /** Built in `_open`: resolving the SQL client is asynchronous on some platforms. */
  private _indexEngine: IndexEngine | undefined;
  /** Resolved when the host opens; the query planner builds compiled statements with it. */
  private _sql: SqlClient.SqlClient | undefined;
  private readonly _convergenceKeyMerger: ConvergenceKeyMerger;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  private readonly _feedStore: FeedStore;
  private readonly _feedDataSource: FeedDataSource;
  private _registryDataSource: RegistryDataSource | undefined;

  /**
   * Whether the index has been reconciled against a registry snapshot in this session. The buffered
   * snapshot starts empty, so the first push cannot tell an entity that left the registry from one
   * this process has simply not been told about yet; rows orphaned by a previous session are
   * reclaimed once, against the first snapshot that arrives.
   */
  private _registryReconciled = false;

  /**
   * Whether a registry pass is outstanding — set when a snapshot changes the buffer, cleared by
   * the pass that indexes it. What lets an unchanged re-push tell "nothing to wait for" apart from
   * "someone else's change is still in flight".
   */
  #registryIndexOwed = false;

  /** Bumped by every snapshot that owes a pass, so a pass cannot clear a debt it never read. */
  #registryGeneration = 0;

  private _updateIndexes!: DeferredTask;

  /**
   * Why the pending index run was scheduled, counted per reason. `DeferredTask` coalesces
   * overlapping `schedule()` calls into one run, so attributing a run needs the full multiset of
   * reasons that accumulated before it started — a single "last caller" field would misattribute
   * every coalesced run.
   */
  private readonly _pendingIndexReasons = new Map<IndexRunReason, number>();

  private _feedService: FeedService.Handlers;

  /**
   * Bumped by every change that needs indexing (not by a pass continuing its own backlog), so a
   * caller can wait for the inputs that existed when it asked rather than for the index to go idle.
   */
  #inputGeneration = 0;

  /** The newest input generation a drained pass has fully indexed. */
  #indexedGeneration = 0;

  /** Whether the last pass found nothing to index. */
  #lastPassIdle = false;

  /** Invalidates a pending full-text flush that a later write has superseded. */
  #ftsFlushGeneration = 0;

  /** When the oldest unflushed write stops being allowed to wait for an idle moment. */
  #ftsFlushDeadline: number | undefined;

  /** Last known document set per space, to detect what left the directory. */
  private readonly _spaceDocumentIds = new Map<SpaceId, Set<DocumentId>>();

  // Feed sync handlers are wired lazily via `setFeedSyncHandlers` to break the construction-time
  // cycle with the FeedSyncer, which itself depends on `this.feedStore`.
  #syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;

  constructor({
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    runtime,
    queryExecutor,
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
    this._automergeDataSource = new AutomergeDataSource(this._automergeHost, {
      isBranchDocument: (documentId) => this._spaceStateManager.isBranchDocument(documentId),
    });

    this._feedStore = new FeedStore({ assignPositions: assignQueuePositions, localActorId: crypto.randomUUID() });
    this._feedDataSource = new FeedDataSource({
      feedStore: this._feedStore,
      runtime: this._runtime,
      getSpaceIds: () => this._spaceStateManager.spaceIds,
    });
    this._feedService = new LocalFeedServiceImpl(runtime, this._feedStore, {
      // Read the mutable slot lazily so a handler wired after construction takes effect;
      // fall back to a no-op before it is set.
      syncFeed: (ctx, request) => this.#syncFeed?.(ctx, request) ?? Promise.resolve(),
    });

    this._convergenceKeyMerger = new ConvergenceKeyMerger({
      queryByConvergenceKeys: (spaceId, keys) =>
        this.indexEngine.queryByConvergenceKeys(spaceId, keys).pipe(RuntimeProvider.runPromise(this._runtime)),
      queryReferrers: (spaceId, targetId) =>
        this.indexEngine
          .queryReferrers(spaceId, EID.make({ entityId: targetId }))
          .pipe(RuntimeProvider.runPromise(this._runtime)),
      loadDoc: (ctx, documentId, opts) => this._automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId, opts),
      flushDoc: (ctx, documentId) => this._automergeHost.flush(ctx, { documentIds: [documentId] }),
    });

    this._queryService = new QueryServiceImpl({
      indexEngine: () => this.indexEngine,
      runtime: this._runtime,
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and cooperative loop apply.
      // `QueryEntry.feedScoped`, or a compiled query whose snapshot store is still filling, is what
      // decides a query must await indexing before its first result.
      updateIndexes: () => this.updateIndexes({ reason: 'feed-scoped-query' }),
      updateRegistry: (clientId, entries, opts) => this.updateRegistry(clientId, entries, opts),
      executor: resolveQueryExecutorMode(queryExecutor),
      sql: () => {
        invariant(this._sql, 'EchoHost is not open.');
        return this._sql;
      },
      hasCompleteSnapshots: () => RuntimeProvider.runPromise(this._runtime)(this.indexEngine.hasCompleteSnapshots()),
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and
      // cooperative loop apply uniformly to the RPC handler path.
      updateIndexes: (request) => this.updateIndexes({ ...request, reason: 'rpc-update-indexes' }),
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
  }

  /**
   * Index engine for queries.
   */
  get indexEngine(): IndexEngine {
    invariant(this._indexEngine, 'EchoHost is not open.');
    return this._indexEngine;
  }

  /** Built alongside the index engine in {@link _open}, for the same reason. */
  get #registryDataSource(): RegistryDataSource {
    invariant(this._registryDataSource, 'EchoHost is not open.');
    return this._registryDataSource;
  }

  protected override async _open(ctx: Context): Promise<void> {
    // The index engine holds its SQL client, and resolving one out of the runtime may suspend --
    // the browser's SQLite layer builds asynchronously -- so it cannot be built in the constructor.
    this._sql = await RuntimeProvider.runPromise(this._runtime)(SqlClient.SqlClient);
    this._indexEngine = new IndexEngine(this._sql);

    // Built here rather than in the constructor: its digest probe reads through the engine above,
    // which cannot exist until the SQL client resolves.
    this._registryDataSource = new RegistryDataSource({
      runtime: this._runtime,
      listPersisted: () => this.indexEngine.listRegistryDigests(),
    });
    // Reset alongside the source they describe: a reopened host gets an empty buffer and a fresh
    // session id, and carrying the old flags over would skip the reconciliation that reclaims the
    // rows no client came back for.
    this._registryReconciled = false;
    this.#registryIndexOwed = false;

    log('echo-host: running index engine migration...');
    await RuntimeProvider.runPromise(this._runtime)(this.indexEngine.migrate());
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
    // RPC handler's `runBlocking` loop can hit a disposed ctx on its next
    // iteration and throw `ContextDisposedError` — which escapes as an
    // unhandled rejection because the originating client `flush()` is
    // fire-and-forget at the test layer. `#releaseIndexWaiters` inside
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
   * Take one client's registry snapshot and index it.
   *
   * Entities no connected client carries any more are reclaimed from the index, including — on the
   * first push of a session — rows a previous session left behind. Resolves once the pushed
   * entities are queryable, so a caller that pushes and then queries does not race the indexer.
   * A releasing client is the exception: it carries no entities and is closing, so it gets the
   * reclamation but not the wait.
   */
  async updateRegistry(
    clientId: string,
    entries: readonly RegistryEntry[],
    opts?: { releasing?: boolean },
  ): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }

    const changed = await this._acceptRegistrySnapshot(clientId, entries, opts);

    // Outside the lock above: an index pass runs until the whole index is quiet, which under a
    // concurrent writer is unbounded, and every client's close waits on a release through that
    // same lock. Holding it here would serialize one client's teardown behind another client's
    // indexing.
    if (changed) {
      this.#scheduleIndexRun('registry-update');
    }

    // A releasing client is closing and will never query, so it does not wait the pass out — the
    // deferred task above runs it either way. Waiting here would hold the client's teardown open
    // for as long as the host's indexer is busy, which is long enough to reorder the rest of its
    // shutdown.
    if (opts?.releasing) {
      return;
    }

    // Waited out whenever a registry pass is outstanding, not only when this snapshot is the one
    // that changed something: an identical snapshot can land right behind the call that did, and
    // returning here would let its caller query rows the indexer has not written yet.
    //
    // Conversely, a snapshot that changed nothing with no pass owed has nothing to wait for, and
    // `updateIndexes` is a pass over the whole index rather than the registry alone — running one
    // per re-push would put the host's entire indexer on the critical path of every client's open.
    if (!this.#registryIndexOwed) {
      return;
    }
    await this.updateIndexes();
  }

  /**
   * Fold one client's snapshot into the buffer and reclaim what it orphaned.
   *
   * Serialized across clients: the buffer update and the deletions it implies have to land as one
   * step, or a second snapshot could reclaim a key between the two and leave the index disagreeing
   * with the buffer. The pass that follows is protected separately — `RegistryDataSource` re-reads
   * each entry at emit time, since passes also run outside this path.
   *
   * @returns whether anything changed, and so whether an index pass is owed.
   */
  @synchronized
  private async _acceptRegistrySnapshot(
    clientId: string,
    entries: readonly RegistryEntry[],
    opts?: { releasing?: boolean },
  ): Promise<boolean> {
    // Before the snapshot is folded in: the source resolves an entry's identity and its
    // already-indexed status from this, and without it a boot parses and probes the whole
    // registry to conclude that nothing changed.
    await this.#registryDataSource.prime().pipe(RuntimeProvider.runPromise(this._runtime));

    const { removed, changed } = this.#registryDataSource.submit(clientId, entries);
    // A releasing client is withdrawing its claim, not unregistering its entities: the rows stay
    // for the next session to re-adopt by digest, and the reconciliation below reclaims whatever
    // no client comes back for.
    const stale = new Set(opts?.releasing ? [] : removed);
    // Never off a release: it carries no entries, so if it is the first snapshot of a session the
    // live set is empty and reconciliation would read the whole persisted registry as orphaned —
    // deleting exactly the rows a release is meant to keep. The first real snapshot reconciles.
    // Gated on a successful prime: an empty `persistedKeys` from a failed read is indistinguishable
    // from an empty index here, and reconciling on it would mark the job done having reclaimed
    // nothing. Left unset, the next snapshot retries.
    const reconciling = !opts?.releasing && !this._registryReconciled && this.#registryDataSource.primed;
    if (reconciling) {
      // Against the digests read by `prime` rather than a scan of its own: the same rows, already
      // in memory, and one query fewer on the path every client takes at startup.
      const live = this.#registryDataSource.keys;
      for (const indexedKey of this.#registryDataSource.persistedKeys) {
        if (!live.has(indexedKey)) {
          stale.add(indexedKey);
        }
      }
    }

    if (stale.size > 0) {
      const deleted = await this.indexEngine
        .deleteRegistryEntries([...stale])
        .pipe(RuntimeProvider.runPromise(this._runtime));
      // Only once the rows are gone: the source skips an entry whose digest matches what it
      // believes the index holds, so a key reclaimed here but left in that record could never be
      // re-registered with the same content for the rest of the session.
      this.#registryDataSource.forgetPersisted(stale);
      log('reclaimed registry entries', { keys: stale.size, rows: deleted });
      this._queryService.invalidateQueries();
    }

    // Recorded only once the query and the deletions it produced have both landed: a throw in
    // either leaves the previous session's rows in place, and a flag set up front would mean no
    // later snapshot ever retries them.
    if (reconciling) {
      this._registryReconciled = true;
    }

    const owed = changed > 0 || stale.size > 0;
    if (owed) {
      // Set here, under the lock, rather than beside the schedule below: the next snapshot is
      // serialized against this one but races the scheduling that follows it, and it has to see
      // that a pass is outstanding in order to wait for it.
      this.#registryIndexOwed = true;
      this.#registryGeneration++;
    }
    return owed;
  }

  /**
   * Rows the indexer holds for the client's registry — the read side of {@link updateRegistry}.
   *
   * Newest registration first, so the first row matching a key is the entity registered last. An
   * unversioned key matches every version registered under it; a versioned key matches only itself.
   */
  async queryIndexedRegistry(
    query: { keys?: readonly string[]; typeDxns?: readonly string[] } = {},
  ): Promise<readonly EntityMeta[]> {
    return this.indexEngine.queryRegistry(query).pipe(RuntimeProvider.runPromise(this._runtime));
  }

  /**
   * Perform any pending index updates.
   *
   * Waits until every change made before the call is indexed. Changes made during the wait are left
   * to later passes, so a stream of writes cannot hold the caller.
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
  async updateIndexes({
    secondaryIndexes = false,
    reason,
  }: { secondaryIndexes?: boolean; reason?: IndexRequestReason } = {}): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    // Waits for the inputs that existed on entry, not for the index to go idle: writes arriving faster
    // than a pass completes never leave the empty batch that idleness needs.
    const target = this.#inputGeneration;
    while (this.#indexedGeneration < target) {
      if (reason) {
        this.#noteIndexRunReason(reason);
      }
      await this._updateIndexes.runBlocking();
      if (this._ctx.disposed) {
        return;
      }
    }
    // One more pass when the last still found work, as the old wait-for-idle ended: under a quiet
    // index it is empty and gives the results the last pass invalidated time to reach their clients,
    // which callers that flush then read depend on. One, so a stream still cannot hold the caller.
    if (!this.#lastPassIdle) {
      await this._updateIndexes.runBlocking();
      if (this._ctx.disposed) {
        return;
      }
    }
    // A pass invalidates queries as it ends and they re-run on their own task; callers flushing the
    // index expect those results too.
    await this._queryService.awaitQueryUpdates();

    if (secondaryIndexes) {
      await this.updateSecondaryIndexes();
    }
  }

  /**
   * Indexes the secondary-index backlog to completion, which the debounced flush otherwise gets to
   * on its own schedule (see {@link IndexEngine.updateSecondaryIndexes}).
   *
   * @returns Number of records indexed.
   */
  async updateSecondaryIndexes(): Promise<number> {
    let records = 0;
    let hint: InvalidationHint | undefined;
    for (;;) {
      if (this._ctx.disposed || !this.isOpen) {
        break;
      }
      const result = await this.indexEngine
        .updateSecondaryIndexes(this._ctx)
        .pipe(RuntimeProvider.runPromise(this._runtime));
      records += result.updated;
      const batch = hintFromIndexingResult(result);
      if (batch) {
        hint = hint ? mergeHints(hint, batch) : batch;
      }
      if (result.done) {
        break;
      }
    }

    // A text query issued before this catch-up matched nothing and would never re-run on its own:
    // the indexer is the sole invalidation source, and this pass is the only writer of the rows.
    if (hint) {
      this._queryService.invalidateQueries(hint);
    }
    return records;
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
        leases: this._automergeHost.leasedDocsCount,
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
        this.indexEngine.deleteObjects({ spaceId, documentIds: wipedDocumentIds, objects: removedInlineObjects }),
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
          this.indexEngine.deleteObjects({ spaceId, documentIds: stale, objects: [] }),
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
    if (reason !== 'batch-continuation') {
      this.#inputGeneration++;
    }
    this.#noteIndexRunReason(reason);
    this._updateIndexes.schedule();
  }

  /**
   * Debounces the deferred full-text re-tokenization, bounded by {@link FTS_FLUSH_MAX_DELAY_MS} so
   * a stream of writes that never pauses still makes progress.
   */
  #scheduleFtsFlush(): void {
    const now = performance.now();
    const deadline = (this.#ftsFlushDeadline ??= now + FTS_FLUSH_MAX_DELAY_MS);
    const generation = ++this.#ftsFlushGeneration;

    scheduleTask(
      this._ctx,
      async () => {
        // A later write re-armed the timer, so its run covers this one too — unless the ceiling
        // has passed, where waiting again is the thing being prevented.
        if (generation !== this.#ftsFlushGeneration && performance.now() < deadline) {
          return;
        }
        this.#ftsFlushDeadline = undefined;
        if (this._ctx.disposed || !this.isOpen) {
          return;
        }

        const records = await this.updateSecondaryIndexes();
        if (records > 0) {
          log.verbose('flushed deferred full-text index', { records });
        }
      },
      Math.max(0, Math.min(FTS_FLUSH_IDLE_MS, deadline - now)),
    );
  }

  /** Drains the pending reasons so each run reports only the requests that produced it. */
  #takeIndexRunReasons(): Record<string, number> {
    const reasons = Object.fromEntries(this._pendingIndexReasons);
    this._pendingIndexReasons.clear();
    return reasons;
  }

  /**
   * Lets every `updateIndexes` caller return: a closing host indexes nothing more, and a waiter left
   * looping would call `runBlocking` again, which throws on the disposed context.
   */
  #releaseIndexWaiters(): void {
    this.#indexedGeneration = this.#inputGeneration;
  }

  private _runUpdateIndexes = async (): Promise<void> => {
    if (this._ctx.disposed || !this.isOpen) {
      this.#releaseIndexWaiters();
      return;
    }

    // Derived and disposed per pass: `@trace.span` derives a child of whatever ctx it is handed,
    // and a child stays on its parent's dispose list until disposed -- at three passes a second,
    // parenting those on `this._ctx` is an unbounded leak.
    const passCtx = this._ctx.derive();
    try {
      // Read before the pass reads its sources, so an input landing mid-pass is left to the next one.
      const generation = this.#inputGeneration;
      // Drained here rather than inside the pass so the span can report what triggered it.
      const outcome = await this._runIndexPass(passCtx, this.#takeIndexRunReasons());
      this.#lastPassIdle = outcome?.done ?? false;
      if (outcome?.drained) {
        this.#indexedGeneration = Math.max(this.#indexedGeneration, generation);
      }
    } finally {
      await passCtx.dispose();
    }
  };

  /**
   * One indexing pass over both data sources.
   *
   * Spanned so that a pass is a single trace naming the requests that caused it, instead of one
   * parentless `IndexEngine.update` root per data source with nothing to attribute it to. The
   * `ctx` the decorator hands back carries the pass span, and `EffectEx.withContext` is what
   * carries it across into the Effect world.
   */
  @trace.span({
    op: 'indexer',
    // Flattened to strings/numbers: OTel attribute values are primitives, so a histogram object
    // would be dropped by the exporter rather than reaching SigNoz.
    attributes: (_ctx: Context, reasons: Record<string, number>) => ({
      reasons: Object.entries(reasons)
        .map(([reason, count]) => `${reason}:${count}`)
        .join(','),
    }),
    // The outcome rides on the span rather than a log line: the only level the OTLP log sink
    // exports (INFO) is also one the browser console shows, and at three passes a second that
    // buries the console it is meant to help.
    resultAttributes: (outcome: IndexPassOutcome | undefined) => ({
      updated: outcome?.updated ?? 0,
      done: outcome?.done ?? false,
      drained: outcome?.drained ?? false,
      // A pass that indexed nothing yet still invalidates queries is the signature of a
      // self-sustaining invalidation loop, so record whether this run re-armed its own trigger.
      invalidates: outcome?.invalidates ?? false,
      spaces: outcome?.spaces ?? 0,
      documents: outcome?.documents ?? 0,
    }),
  })
  private async _runIndexPass(ctx: Context, reasons: Record<string, number>): Promise<IndexPassOutcome | undefined> {
    const startedAt = performance.now();

    try {
      const combinedResult = _makeEmptyMergedResult();

      {
        performance.mark('indexEngine.update.automerge:start');
        const result = await this.indexEngine
          .update(ctx, this._automergeDataSource, { spaceId: null, limit: 50 })
          .pipe(EffectEx.withContext(ctx), RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);

        // Convergence-key duplicates are born from replication, and a replicated write is exactly what
        // was just indexed — so this is the earliest a duplicate can be detected on this device.
        // The trigger is the durable intent log written in the same transaction as the index
        // cursors: a crash or a faulted merge pass leaves the intents in place, and this pass —
        // which also runs once at every startup — retries them, so no detected duplicate is ever
        // silently dropped. The merge's own writes land back here via `documentsSaved`, which
        // re-indexes the tombstones; idempotence is what makes that follow-up pass a no-op.
        const { maxId, intents } = await this.indexEngine
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
              await this.indexEngine
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
        this.#releaseIndexWaiters();
        return;
      }

      {
        performance.mark('indexEngine.update.queue:start');
        const result = await this.indexEngine
          .update(ctx, this._feedDataSource, { spaceId: null, limit: 50 })
          .pipe(EffectEx.withContext(ctx), RuntimeProvider.runPromise(this._runtime));
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

      if (this._ctx.disposed || !this.isOpen) {
        this.#releaseIndexWaiters();
        return;
      }

      {
        // Read before the leg: a snapshot folded in while it runs bumps this, and clearing the
        // flag on a generation this pass never saw would tell that snapshot's caller its entries
        // are queryable when the pass had already read past them.
        const generation = this.#registryGeneration;
        const result = await this.indexEngine
          .update(ctx, this.#registryDataSource, { spaceId: null, limit: 50 })
          .pipe(EffectEx.withContext(ctx), RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);
        // Cleared only once the leg has drained: a batch that stopped at its limit still owes the
        // rest, and a waiter told otherwise would read an index missing the tail.
        if (result.done && this.#registryGeneration === generation) {
          this.#registryIndexOwed = false;
        }
      }

      // After the registry leg, not before it: registry entities land in the FTS snapshot store
      // like anything else, so a pass that only indexed the registry still owes a flush.
      if (combinedResult.updated > 0) {
        this.#scheduleFtsFlush();
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
        drained: combinedResult.drained,
        spaces: combinedResult.spaces.size,
        queues: combinedResult.queues.size,
        documents: combinedResult.documents.size,
        types: combinedResult.types.size,
        objects: combinedResult.objects.size,
      });
      await sleep(1);
      if (!combinedResult.done) {
        this.#scheduleIndexRun('batch-continuation');
      }
      // Invalidate queries after index update — the indexer is the sole invalidation source.
      if (hint) {
        this._queryService.invalidateQueries(hint);
      }

      return {
        updated: combinedResult.updated,
        done: combinedResult.done,
        drained: combinedResult.drained,
        invalidates: !!hint,
        spaces: combinedResult.spaces.size,
        documents: combinedResult.documents.size,
      };
    } catch (err) {
      if (this._ctx.disposed || !this.isOpen) {
        this.#releaseIndexWaiters();
        return;
      }
      log.catch(err);
      // Failsafe: prevent queries from freezing if the indexer faults.
      this._queryService.invalidateQueries();
      throw err;
    }
  }
}

export type { EchoDataStats };

/** What one indexing pass did, as the span reports it. */
type IndexPassOutcome = {
  updated: number;
  done: boolean;
  drained: boolean;
  invalidates: boolean;
  spaces: number;
  documents: number;
};

type MutableIndexingAccumulator = {
  updated: number;
  done: boolean;
  drained: boolean;
  spaces: Set<SpaceId>;
  queues: Set<EntityId>;
  documents: Set<string>;
  types: Set<string>;
  objects: Set<EntityId>;
};

const _makeEmptyMergedResult = (): MutableIndexingAccumulator => ({
  updated: 0,
  done: true,
  drained: true,
  spaces: new Set(),
  queues: new Set(),
  documents: new Set(),
  types: new Set(),
  objects: new Set(),
});

const _mergeInto = (acc: MutableIndexingAccumulator, r: IndexingResult): void => {
  acc.updated += r.updated;
  acc.done = acc.done && r.done;
  acc.drained = acc.drained && r.drained;
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
  'peerIdProvider' | 'getSpaceKeyByRootDocumentId' | 'assignQueuePositions' | 'useSubduction' | 'queryExecutor'
>;

/**
 * Effect Layer constructing a dormant {@link EchoHost}.
 */
export const EchoHostLayer = (
  options: EchoHostLayerOptions = {},
): Layer.Layer<EchoHostService, never, SqlClient.SqlClient> =>
  Layer.effect(
    EchoHostService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
      return new EchoHost({ runtime, ...options });
    }),
  );
