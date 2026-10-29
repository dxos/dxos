//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import {
  type AnyDocumentId,
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
  isValidDocumentId,
  stringifyAutomergeUrl,
} from '@automerge/automerge-repo';
import * as Clock from 'effect/Clock';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/sql/SqlClient';

import { Mutex, scheduleTask, sleep, yieldBehindQueuedTasks } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import {
  DatabaseDirectory,
  EntityStructure,
  type RetirementReason,
  SPACE_ROOT_TYPE,
  SpaceDocVersion,
  type SpaceRoot,
  createIdFromSpaceKey,
  directoryJson,
  isSpaceRoot,
} from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { type FeedKey, type FeedOptions, FeedStore, type TrimResult } from '@dxos/feed';
import { IndexEngine, type IndexingResult, type IndexTransactionLimits } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, type PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';
import { type DataService, type FeedService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';
import { countWork, defaultMap, markMilestone } from '@dxos/util';

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
import { sameHeads } from '../query/object-state.ts';
import { SLOW_WORK_MS } from '../util.ts';
import { AutomergeDataSource } from './automerge-data-source.ts';
import { ConvergenceKeyMerger } from './convergence-key-merge.ts';
import { DataServiceImpl } from './data-service.ts';
import { type DatabaseRoot } from './database-root.ts';
import { DeletionResolver } from './deletion.ts';
import { BACKFILL_FINISHED, FeedDataSource, backfillResourceId } from './feed-data-source.ts';
import { type IndexRequestReason, IndexScheduler } from './index-scheduler.ts';
import { IndexStatusTracker, countIndexBacklog, readFeedPin } from './index-status.ts';
import { type InvalidationHint, hintFromIndexingResult, mergeHints } from './invalidation-hint.ts';
import { LocalFeedServiceImpl } from './local-feed-service.ts';
import { type QueryDebounceOptions, QueryServiceImpl } from './query-service.ts';
import {
  HISTORY_BLOAT_MIN_OPS,
  type IndexedObject,
  type Retirement,
  buildReplacementDocument,
  isHistoryBloated,
  isRetirableForHistory,
  makeReplacementDirectory,
  replacementDocumentId,
} from './retirement.ts';
import { type SpaceDocumentListUpdatedEvent, type SpaceRootRefs, SpaceStateManager } from './space-state-manager.ts';

/**
 * Documents walked between event-loop yields during a reachability traversal. Bounds how long one
 * pass can hold the worker thread; the walk is best-effort maintenance and never latency-critical.
 */
const CLOSURE_YIELD_INTERVAL = 32;

const AUTOMATIC_GARBAGE_COLLECTION = false;

const AUTOMERGE_URL_PREFIX = 'automerge:';

/**
 * The document id a link spells, without validating it: for matching against ids already known to be
 * valid, where a `parseAutomergeUrl` checksum per link would cost more than the lookup it guards.
 */
const linkedDocumentIdText = (url: string): string => {
  if (!url.startsWith(AUTOMERGE_URL_PREFIX)) {
    return '';
  }
  // `parseAutomergeUrl` takes the id verbatim up to a sub-document path (`/`) or heads (`#`).
  let end = AUTOMERGE_URL_PREFIX.length;
  while (end < url.length && url[end] !== '/' && url[end] !== '#') {
    end++;
  }
  return url.slice(AUTOMERGE_URL_PREFIX.length, end);
};

/**
 * Idle window before the second indexing step re-tokenizes what the first one wrote, and the
 * ceiling an unbroken write stream cannot push it past. A typing burst then costs one rebuild
 * rather than one per save; nothing a query reads depends on either number, since text search
 * flushes for itself and every other read comes from the snapshot store.
 */
const FTS_FLUSH_IDLE_MS = 1_000;
const FTS_FLUSH_MAX_DELAY_MS = 10_000;

/** Trimmed blocks one take of the trimmed log reads, and the takes one index pass makes before it yields to the next. */
const PURGE_BATCH = 1_000;
const PURGE_BATCHES_PER_PASS = 10;

const isIndexingDisabled = (options: FeedOptions | undefined): boolean => options?.indexing?.enabled === false;

/** Repeats a bounded trim until it reports nothing left past a limit. */
const trimUntilDone = Effect.fnUntraced(function* <E, R>(
  trim: Effect.Effect<TrimResult, E, R>,
  first: TrimResult = { deleted: 0, more: true },
) {
  let result = first;
  let deleted = result.deleted;
  while (result.more) {
    result = yield* trim;
    deleted += result.deleted;
  }
  return deleted;
});

/** Feeds whose index rows a pass changed outside the index legs, as a hint unconstrained by type or object. */
type FeedChanges = { spaceIds: Set<SpaceId>; queueIds: Set<EntityId> };

const makeFeedChanges = (): FeedChanges => ({ spaceIds: new Set(), queueIds: new Set() });

const hintFromFeedChanges = (changes: FeedChanges): InvalidationHint | undefined =>
  changes.queueIds.size === 0 ? undefined : { spaceIds: changes.spaceIds, queueIds: changes.queueIds };

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

  /** Overrides how live queries are debounced in proportion to their cost; see {@link QueryDebounceOptions}. */
  queryDebounce?: Partial<QueryDebounceOptions>;

  /** Overrides the bounds on one index write transaction; see {@link IndexTransactionLimits}. */
  indexTransactionLimits?: Partial<IndexTransactionLimits>;

  /** Overrides how often index progress is counted, once a second by default. */
  indexRecountInterval?: number;

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

  private readonly _indexScheduler: IndexScheduler;

  /** What the index is doing, for boot screens and progress indicators; see {@link DataService.IndexStatus}. */
  readonly indexStatus: IndexStatusTracker;

  private _feedService: FeedService.Handlers;

  readonly #indexTransactionLimits: Partial<IndexTransactionLimits> | undefined;

  /** Invalidates a pending full-text flush that a later write has superseded. */
  #ftsFlushGeneration = 0;

  /** Whether the first index pass, and the first pass that left nothing behind, are marked on the timeline. */
  #indexingMarked = false;
  /** The last document leg read every saved document, so until one is saved again a pass need not rescan them. */
  #documentsDrained = false;
  #caughtUpMarked = false;

  readonly #secondaryIndexLock = new Mutex();

  /** When the oldest unflushed write stops being allowed to wait for an idle moment. */
  #ftsFlushDeadline: number | undefined;

  /** Last known document set per space, to detect what left the directory. */
  private readonly _spaceDocumentIds = new Map<SpaceId, Set<DocumentId>>();

  /** The latest retirement pass per space; passes are chained so two never write one space's directory at once. */
  readonly #retirements = new Map<SpaceId, Promise<void>>();

  /** Retired documents wiped this session, since every later directory change still lists them. */
  readonly #wipedDocuments = new Set<DocumentId>();

  /** Retirements this host wrote or saw this session, to write back an entry a concurrent change dropped. */
  readonly #knownRetirements = new Map<DocumentId, Retirement & { spaceId: SpaceId }>();

  /** Op counts of loaded documents big enough to be retired for their history. */
  readonly #historyCandidates = new Map<DocumentId, number>();

  // Feed sync handlers are wired lazily via `setFeedSyncHandlers` to break the construction-time
  // cycle with the FeedSyncer, which itself depends on `this.feedStore`.
  #syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;

  constructor({
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    runtime,
    queryExecutor,
    queryDebounce,
    indexTransactionLimits,
    indexRecountInterval,
    assignQueuePositions = false,
    useSubduction,
  }: EchoHostProps) {
    super();
    this.#indexTransactionLimits = indexTransactionLimits;
    this.indexStatus = new IndexStatusTracker({ recountInterval: indexRecountInterval });

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
      directories: {
        isSpaceRoot: (documentId) => this._spaceStateManager.isSpaceRootDocument(documentId),
        store: (documentId, snapshot) => this._spaceStateManager.writeDirectorySnapshot(documentId, snapshot),
      },
    });

    this._feedStore = new FeedStore({ assignPositions: assignQueuePositions, localActorId: crypto.randomUUID() });
    this._feedDataSource = new FeedDataSource({
      feedStore: this._feedStore,
      runtime: this._runtime,
      getSpaceIds: () => this._spaceStateManager.spaceIds,
    });
    this._indexScheduler = new IndexScheduler({
      feedBlocks: this._feedStore.onNewBlocks,
      documentsSaved: this._automergeHost.documentsSaved,
      runPass: (ctx, reasons) => this._runIndexPass(ctx, reasons),
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
      executor: resolveQueryExecutorMode(queryExecutor),
      feedStore: this._feedStore,
      debounce: queryDebounce,
      sql: () => {
        invariant(this._sql, 'EchoHost is not open.');
        return this._sql;
      },
      hasCompleteSnapshots: (scope) =>
        RuntimeProvider.runPromise(this._runtime)(this.indexEngine.hasCompleteSnapshots(scope)),
      holdsDocument: (subscriptionIds, documentId) => this._dataService.holds(subscriptionIds, documentId),
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      // Delegate to the public method so the closed-host early-out and
      // cooperative loop apply uniformly to the RPC handler path.
      updateIndexes: (request) => this.updateIndexes({ ...request, reason: 'rpc-update-indexes' }),
      getSpaceStats: (spaceId) => this.getSpaceStats(spaceId),
      indexStatus: this.indexStatus,
      runGarbageCollection: (spaceId, options) => this.runGarbageCollection(spaceId, options),
      readDirectorySnapshot: (documentId) => this.readDirectorySnapshot(documentId),
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

  protected override async _open(ctx: Context): Promise<void> {
    // The index engine holds its SQL client, and resolving one out of the runtime may suspend --
    // the browser's SQLite layer builds asynchronously -- so it cannot be built in the constructor.
    this._sql = await RuntimeProvider.runPromise(this._runtime)(SqlClient.SqlClient);
    this._indexEngine = new IndexEngine(this._sql, {
      transactionLimits: this.#indexTransactionLimits,
      yieldBetweenTransactions: yieldBehindQueuedTasks,
    });

    const pendingMigrations = await RuntimeProvider.runPromise(this._runtime)(this.indexEngine.pendingMigrations());
    log('echo-host: running index engine migration...', { pending: pendingMigrations });
    if (pendingMigrations > 0) {
      this.indexStatus.setMigrating(0, pendingMigrations);
    }
    await RuntimeProvider.runPromise(this._runtime)(
      this.indexEngine.migrate({
        onProgress: (applied) => this.indexStatus.setMigrating(applied, pendingMigrations),
      }),
    );
    log('echo-host: index engine migration done');

    log('echo-host: running feed store migration...');
    await RuntimeProvider.runPromise(this._runtime)(this._feedStore.migrate());
    log('echo-host: feed store migration done');

    // Age expires with no write to trigger a trim, so open is when expired blocks of an idle feed go.
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen({ self: this }, function* () {
        yield* this.#trimSpaces(yield* this._feedStore.listSpacesWithOptions());
      }),
    );

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

    const pin = await RuntimeProvider.runPromise(this._runtime)(readFeedPin()).catch((err) => {
      log.warn('index feed pin read failed', { err });
      return FeedProtocol.FEED_START;
    });
    await this.indexStatus.opened(() =>
      RuntimeProvider.runPromise(this._runtime)(countIndexBacklog({ pin, spaceIds: this._spaceStateManager.spaceIds })),
    );
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

      // A directory change can carry another peer's retirement, and a newly opened space can link a document
      // quarantined on an earlier start.
      this.#scheduleRetirement(e.spaceId);
    });
    this._automergeHost.documentQuarantined.on(this._ctx, ({ reason }) => {
      if (reason === 'load-failed') {
        for (const spaceId of this._spaceStateManager.spaceIds) {
          this.#scheduleRetirement(spaceId);
        }
      }
    });
    this._automergeHost.documentLoaded.on(this._ctx, ({ documentId, ops }) => {
      if (ops >= HISTORY_BLOAT_MIN_OPS) {
        this.#historyCandidates.set(documentId, ops);
        // The index may already be current, in which case no index pass will bring the document up again.
        for (const spaceId of this._spaceStateManager.spaceIds) {
          this.#scheduleRetirement(spaceId);
        }
      }
    });
    // Opened on the host's context, so the scheduler stops subscribing the moment the host starts closing.
    await this._indexScheduler.open(this._ctx);
    log('echo-host: open complete');
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._indexScheduler.close();

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
    await this._indexScheduler.waitForIndexed(reason);
    if (this._ctx.disposed) {
      return;
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
   * on its own schedule (see {@link IndexEngine.updateSecondaryIndexes}). Runs one at a time: a call
   * made during a run waits for it, then runs on its own to cover what the run may have missed.
   *
   * @returns Number of records indexed.
   */
  async updateSecondaryIndexes(): Promise<number> {
    return this.#secondaryIndexLock.executeSynchronized(() => this.#indexSecondary());
  }

  async #indexSecondary(): Promise<number> {
    const ctx = this._ctx;
    const startedAt = performance.now();
    let records = 0;
    let batches = 0;
    let hint: InvalidationHint | undefined;
    try {
      while (!ctx.disposed && this.isOpen) {
        if (batches > 0) {
          await yieldBehindQueuedTasks();
          if (ctx.disposed) {
            break;
          }
        }
        const result = await this.indexEngine
          .updateSecondaryIndexes(ctx)
          .pipe(RuntimeProvider.runPromise(this._runtime));
        records += result.updated;
        batches++;
        const batch = hintFromIndexingResult(result);
        if (batch) {
          hint = hint ? mergeHints(hint, batch) : batch;
        }
        if (result.done || ctx.disposed || !this.isOpen) {
          break;
        }
        await this.indexStatus.afterFullTextBatch(() =>
          this.indexEngine.countSecondaryBacklog().pipe(RuntimeProvider.runPromise(this._runtime)),
        );
      }
    } finally {
      this.indexStatus.fullTextEnded();
    }

    // A text query issued before this catch-up matched nothing and would never re-run on its own:
    // the indexer is the sole invalidation source, and this pass is the only writer of the rows.
    if (hint) {
      this._queryService.invalidateQueries(hint);
    }

    const durationMs = performance.now() - startedAt;
    if (durationMs >= SLOW_WORK_MS) {
      log.warn('slow full-text catch-up', { durationMs, records, batches });
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
  async adoptSpaceRoot(
    ctx: Context,
    spaceId: SpaceId,
    spaceRootUrl: AutomergeUrl,
    { fetchFromNetwork = false, timeout }: { fetchFromNetwork?: boolean; timeout?: number } = {},
  ): Promise<SpaceRootRefs> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const existing = this._spaceStateManager.getSpaceRootRefs(spaceId);
    if (existing) {
      invariant(existing.spaceRootDocUrl === spaceRootUrl, `Space already anchored on another root: ${spaceId}`);
      return existing;
    }

    // Local-only by default: a caller adopting a root it was merely told about must not block on the
    // network. A root edge minted exists nowhere else, so that caller opts in to fetching it.
    using rootHandle = await this._automergeHost.loadDoc<SpaceRoot>(ctx, spaceRootUrl, { fetchFromNetwork, timeout });
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
    return this.#assignRoot(ctx, spaceId, `automerge:${documentId}` as AutomergeUrl);
  }

  async updateSpaceRoot(ctx: Context, spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const currentRoot = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (currentRoot && currentRoot.url === automergeUrl) {
      return currentRoot;
    }
    return this.#assignRoot(ctx, spaceId, automergeUrl);
  }

  /**
   * Assigns a space its root from the directory snapshot the index holds, when that is current, so a space nothing
   * writes this session never loads its root; otherwise loads the root, which the space then keeps resident.
   */
  async #assignRoot(ctx: Context, spaceId: SpaceId, url: AutomergeUrl): Promise<DatabaseRoot> {
    const documentId = interpretAsDocumentId(url);
    const snapshot = this._spaceStateManager.getRootByDocumentId(documentId)
      ? undefined
      : await this.readDirectorySnapshot(documentId);
    if (snapshot) {
      const root = await this._spaceStateManager.assignRootToSpace(spaceId, {
        documentId,
        snapshot: { heads: snapshot.heads, json: JSON.parse(snapshot.json) },
        load: async () => {
          const lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, url, {
            fetchFromNetwork: true,
          });
          invariant(lease, 'Space root document must load before it is written.');
          return lease;
        },
        headsChanged: this._automergeHost.documentHeadsChanged,
      });
      // A save between reading the snapshot and the root's subscription would otherwise go unseen.
      const [storedHeads] = await this._automergeHost.getStoredHeads([documentId]);
      if (!storedHeads || !sameHeads(storedHeads, snapshot.heads)) {
        await root.load();
      }
      return root;
    }
    const lease = await this._automergeHost.loadDoc<DatabaseDirectory>(ctx, url, {
      fetchFromNetwork: true,
    });
    invariant(lease, 'Space root document must load before assignment.');
    // Written here as well as by the index: a root indexed before snapshots existed is never re-read by it.
    await this.#writeDirectorySnapshot(documentId, lease.doc());
    // The lease is handed over: the space's root stays resident for as long as the space is open.
    return this._spaceStateManager.assignRootToSpace(spaceId, { lease });
  }

  /**
   * The directory JSON the index holds for a space root, when it was read at the heads the root is stored at: what
   * a client or this host can show the root from without loading it.
   */
  async readDirectorySnapshot(documentId: DocumentId): Promise<{ heads: Heads; json: string } | undefined> {
    const [stored, [storedHeads]] = await Promise.all([
      this._spaceStateManager.readDirectorySnapshot(documentId),
      this._automergeHost.getStoredHeads([documentId]),
    ]);
    return stored && storedHeads && sameHeads(stored.heads, storedHeads)
      ? { heads: storedHeads, json: stored.json }
      : undefined;
  }

  /** Stores a loaded root's directory JSON, when the root is saved at the heads it is read at. */
  async #writeDirectorySnapshot(documentId: DocumentId, doc: A.Doc<DatabaseDirectory>): Promise<void> {
    const json = directoryJson(doc);
    if (json === undefined) {
      return;
    }
    const heads = A.getHeads(doc);
    const [storedHeads] = await this._automergeHost.getStoredHeads([documentId]);
    if (storedHeads && sameHeads(storedHeads, heads)) {
      await this._spaceStateManager.writeDirectorySnapshot(documentId, { heads, json });
    }
  }

  async closeSpace(spaceId: SpaceId): Promise<void> {
    todo();
  }

  /**
   * Runs `wipe`, which deletes this host's rows while it stays open, with indexing stopped and the feed
   * store's caches dropped after it: either would otherwise write cursors under tokens the wipe deleted.
   */
  async wipeStorage(wipe: () => Promise<void>): Promise<void> {
    // Closing drains the pass under way.
    await this._indexScheduler.close();
    try {
      await wipe();
    } finally {
      this._feedStore.resetCaches();
      await this._indexScheduler.open(this._ctx);
    }
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

  /** Queues a retirement pass for a space behind the one already running. Failures are logged, not propagated. */
  #scheduleRetirement(spaceId: SpaceId): void {
    const previous = this.#retirements.get(spaceId) ?? Promise.resolve();
    const next = previous
      .then(() => this.#retireDocuments(spaceId))
      .catch((err) => {
        if (!this._ctx.disposed) {
          log.warn('document retirement failed', { spaceId, err });
        }
      });
    this.#retirements.set(spaceId, next);
  }

  /**
   * Retirement, in every direction. Documents the space directory has retired are wiped without being read —
   * the share of every peer. Linked documents this host could not load, or whose history outgrew their state,
   * are rebuilt from the index and retired in the directory — the share of the peer that found them.
   */
  async #retireDocuments(spaceId: SpaceId): Promise<void> {
    if (this._ctx.disposed || !this.isOpen) {
      return;
    }
    const root = this._spaceStateManager.getRootBySpaceId(spaceId);
    const directory = root?.directory();
    if (!root || !directory) {
      return;
    }

    await this.#wipeRetiredDocuments(spaceId, DatabaseDirectory.getRetiredDocuments(directory));
    await this.#restoreLostRetirements(spaceId, root);

    // Keyed by the id as it is spelled in a link, so the scan below compares strings: decoding every link
    // (a base58check checksum each) on every directory change saturated the worker on large spaces.
    const candidates = new Map<string, DocumentId>();
    for (const [documentId, record] of this._automergeHost.quarantinedDocuments) {
      if (record.reason === 'load-failed') {
        candidates.set(documentId, documentId);
      }
    }
    for (const documentId of this.#historyCandidates.keys()) {
      candidates.set(documentId, documentId);
    }
    if (candidates.size === 0) {
      return;
    }

    const unloadable = new Map<DocumentId, string[]>();
    const bloated = new Map<DocumentId, string[]>();
    for (const [objectId, link] of Object.entries(directory.links ?? {})) {
      const documentId = candidates.get(linkedDocumentIdText(link.toString()));
      if (documentId === undefined || directory.retired?.[documentId] !== undefined) {
        continue;
      }
      if (this._automergeHost.quarantinedDocuments.get(documentId)?.reason === 'load-failed') {
        defaultMap(unloadable, documentId, () => []).push(objectId);
      } else if (this.#historyCandidates.has(documentId)) {
        defaultMap(bloated, documentId, () => []).push(objectId);
      }
    }
    for (const [documentId, objectIds] of unloadable) {
      await this.#retireUnloadableDocument(spaceId, root, documentId, objectIds);
    }
    for (const [documentId, objectIds] of bloated) {
      await this.#retireBloatedDocument(spaceId, root, documentId, objectIds);
    }
  }

  /**
   * Writes back `retired` entries this host knows of but the directory lacks. Two peers that each create the
   * map concurrently leave only one of them in the merge, so an entry can vanish after it was written.
   */
  async #restoreLostRetirements(spaceId: SpaceId, root: DatabaseRoot): Promise<void> {
    const directory = root.directory();
    const lost = [...this.#knownRetirements.values()].filter(
      (retirement) => retirement.spaceId === spaceId && directory?.retired?.[retirement.documentId] === undefined,
    );
    if (lost.length === 0) {
      return;
    }
    await root.load();
    root.change((draft) => {
      draft.retired ??= {};
      for (const { documentId, replacedBy, reason } of lost) {
        draft.retired[documentId] = { replacedBy: new A.RawString(replacedBy), reason: new A.RawString(reason) };
      }
    });
    log.info('restored retirements lost to a concurrent change', { spaceId, documents: lost.length });
  }

  /**
   * Retires a document that cannot be loaded, rebuilt from the state the index last saw. Left quarantined, and
   * not retired, while the index lacks any of the document's objects.
   */
  async #retireUnloadableDocument(
    spaceId: SpaceId,
    root: DatabaseRoot,
    documentId: DocumentId,
    objectIds: string[],
  ): Promise<void> {
    const indexed = await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen({ self: this }, function* () {
        const metas = (yield* this.indexEngine.queryObjectIds({ spaceIds: [spaceId], objectIds })).filter(
          (meta) => meta.documentId === documentId,
        );
        const snapshots = new Map(
          (yield* this.indexEngine.querySnapshotsJSON(metas.map((meta) => meta.recordId))).map(
            ({ recordId, snapshot }) => [recordId, snapshot],
          ),
        );
        return metas.flatMap((meta): IndexedObject[] => {
          const json = snapshots.get(meta.recordId);
          return json ? [{ objectId: meta.objectId, json, createdAt: meta.createdAt }] : [];
        });
      }),
    );
    const missing = objectIds.filter((objectId) => !indexed.some((object) => object.objectId === objectId));
    if (missing.length > 0) {
      log.warn('unloadable document kept quarantined: the index has no state for some of its objects', {
        spaceId,
        documentId,
        missing,
      });
      return;
    }

    await this.#replaceDocument(
      spaceId,
      root,
      documentId,
      objectIds,
      makeReplacementDirectory({ spaceId, spaceKey: root.getSpaceKey(), objects: indexed }),
      'load-failed',
    );
    log.info('retired a document that could not be loaded', { spaceId, documentId, objects: objectIds.length });
  }

  /**
   * Retires a loaded document whose history has outgrown its state, if it holds only the objects linked to it and
   * all are of a type that may be rebuilt (see `HISTORY_RETIREMENT_TYPES`). Rebuilt from the document's own current
   * state, so it keeps every change, including any the index has not caught up with.
   */
  async #retireBloatedDocument(
    spaceId: SpaceId,
    root: DatabaseRoot,
    documentId: DocumentId,
    objectIds: string[],
  ): Promise<void> {
    const ops = this.#historyCandidates.get(documentId) ?? 0;
    this.#historyCandidates.delete(documentId);
    using lease = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, documentId);
    const state = lease ? A.toJS(lease.doc()) : undefined;
    const objects = state?.objects ?? {};
    if (
      !state ||
      Object.keys(objects).length !== objectIds.length ||
      !isRetirableForHistory(objectIds.map((objectId) => objects[objectId]?.system?.type?.['/']))
    ) {
      return;
    }
    const stateBytes = JSON.stringify(objects).length;
    if (!isHistoryBloated({ ops, stateBytes })) {
      return;
    }

    await this.#replaceDocument(
      spaceId,
      root,
      documentId,
      objectIds,
      { version: state.version, access: state.access, objects },
      'history',
    );
    log.info('retired a document whose history outgrew its state', {
      spaceId,
      documentId,
      ops,
      stateBytes,
      objects: objectIds.length,
    });
  }

  /**
   * Replaces a document with `directory`, which carries no history, then records the retirement in the space
   * directory, which every peer acts on, and wipes the original here.
   */
  async #replaceDocument(
    spaceId: SpaceId,
    root: DatabaseRoot,
    documentId: DocumentId,
    objectIds: string[],
    directory: DatabaseDirectory,
    reason: RetirementReason,
  ): Promise<void> {
    const replacementId = await replacementDocumentId(documentId);
    const replacementUrl = stringifyAutomergeUrl(replacementId);
    // Another peer's retirement may have delivered the replacement already; importing over it would start a
    // second history for the same objects.
    const [existingHeads] = await this._automergeHost.getHeads([replacementId]);
    const lease =
      existingHeads && existingHeads.length > 0
        ? undefined
        : await this._automergeHost.createDoc<DatabaseDirectory>(
            await buildReplacementDocument(documentId, directory),
            { preserveHistory: true, documentId: replacementId },
          );
    try {
      await root.load();
      root.change((draft) => {
        draft.links ??= {};
        for (const objectId of objectIds) {
          draft.links[objectId] = new A.RawString(replacementUrl);
        }
        draft.retired ??= {};
        draft.retired[documentId] = { replacedBy: new A.RawString(replacementUrl), reason: new A.RawString(reason) };
      });
      await this._automergeHost.flush(this._ctx, { documentIds: [root.documentId, replacementId] });
    } finally {
      lease?.[Symbol.dispose]();
    }

    await this.#wipeRetiredDocuments(spaceId, [{ documentId, replacedBy: replacementUrl, reason }]);
  }

  /**
   * Wipes documents the space directory retired, without reading them: the directory naming them is the
   * attribution, since loading one is what retirement exists to avoid. Idempotent, and run on every open, since the
   * directory is the only durable record of a retirement.
   */
  async #wipeRetiredDocuments(spaceId: SpaceId, entries: readonly Retirement[]): Promise<void> {
    const candidates = entries.filter(
      (entry): entry is Retirement & { documentId: DocumentId } =>
        isValidDocumentId(entry.documentId) && !this.#wipedDocuments.has(entry.documentId),
    );
    if (candidates.length === 0) {
      return;
    }
    const referenced = this.#referencedDocuments();
    const indexedElsewhere = await RuntimeProvider.runPromise(this._runtime)(
      this.indexEngine.queryDocumentsIndexedElsewhere({
        spaceId,
        documentIds: candidates.map((entry) => entry.documentId),
      }),
    );
    const isProtected = (documentId: DocumentId) => referenced.has(documentId) || indexedElsewhere.has(documentId);
    const retired = candidates.filter((entry) => !isProtected(entry.documentId));
    if (retired.length < candidates.length) {
      log.warn('ignored retirements naming documents another space or a live link still uses', {
        spaceId,
        documentIds: candidates.filter((entry) => isProtected(entry.documentId)).map((entry) => entry.documentId),
      });
    }
    if (retired.length === 0) {
      return;
    }
    for (const retirement of retired) {
      this.#knownRetirements.set(retirement.documentId, { ...retirement, spaceId });
      await this._automergeHost.quarantineDocument(retirement.documentId, { reason: 'retired' });
    }
    const documentIds = retired.map(({ documentId }) => documentId);
    // Index rows first: the indexer finds documents through them, so one outliving its bytes would be read again.
    await RuntimeProvider.runPromise(this._runtime)(
      this.indexEngine.deleteObjects({ spaceId, documentIds, objects: [] }),
    );
    for (const documentId of documentIds) {
      await this._automergeHost.removeDocument(documentId);
      this.#wipedDocuments.add(documentId);
      this.#historyCandidates.delete(documentId);
    }
    log('wiped retired documents', { spaceId, documents: documentIds.length });
  }

  /**
   * Documents a space on this host still references: the directory, space root and credentials of every persisted
   * space, opened or not, and every link and branch of an open directory. A `retired` entry naming one is never acted
   * on, since any member can write a directory and a document id may belong to another space; a genuine retirement
   * re-points the links in the same change. Links of an unopened directory are covered by the index instead.
   */
  #referencedDocuments(): Set<DocumentId> {
    const urls: string[] = [];
    const referenced = new Set<DocumentId>();
    for (const spaceId of this._spaceStateManager.spaceIds) {
      const directoryId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
      if (directoryId) {
        referenced.add(directoryId);
      }
      const refs = this._spaceStateManager.getSpaceRootRefs(spaceId);
      urls.push(...[refs?.spaceRootDocUrl, refs?.credentialsDocUrl].filter((url) => url !== undefined));
    }
    for (const [documentId, root] of this._spaceStateManager.roots) {
      referenced.add(documentId);
      if (root.directory()) {
        urls.push(...root.getAllLinkedDocuments().map((url) => url.toString()));
      }
    }
    for (const url of urls) {
      if (isValidAutomergeUrl(url)) {
        referenced.add(interpretAsDocumentId(url));
      }
    }
    return referenced;
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
    const doc = root.directory();
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

    const rootDoc = root.directory();
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
    const rootDoc = root.directory();
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

    await root.load();
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

  /** Resolve the space root, opening it if this host does not hold it yet. */
  async #ensureSpaceRootLoaded(spaceId: SpaceId): Promise<DatabaseRoot> {
    const existing = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (existing?.isAvailable) {
      return existing;
    }
    return this.openSpaceRoot(this._ctx, spaceId);
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

  /**
   * Applies each pending feed-options intent to the feed store and clears it. The index side runs
   * before the store write, so a crash in between redoes it: a disable removes the feed's rows on
   * every apply, and a re-enable seeds the backfill while the store still holds the disabled options.
   * A failed apply leaves its intent pending for the next pass.
   */
  #applyFeedOptionsIntents(changes: FeedChanges): Effect.Effect<void, never, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const { maxId, intents } = yield* this.indexEngine.takeFeedOptionsIntents();
      for (const { spaceId, feedId, namespace, options } of intents) {
        const feed: FeedKey = { spaceId, feedId, feedNamespace: namespace };
        yield* Effect.gen({ self: this }, function* () {
          const previous = yield* this._feedStore.getFeedOptions(feed);
          if (isIndexingDisabled(options)) {
            const deleted = yield* this.indexEngine.deleteFeedObjects({ spaceId, queueId: feedId });
            if (deleted > 0 && EntityId.isValid(feedId)) {
              changes.spaceIds.add(spaceId);
              changes.queueIds.add(feedId);
            }
          } else if (isIndexingDisabled(previous)) {
            yield* this.indexEngine.seedCursor({
              sourceName: this._feedDataSource.sourceName,
              spaceId,
              resourceId: backfillResourceId(namespace, feedId),
              cursor: '',
            });
          }
          const { trim } = yield* this._feedStore.setFeedOptions({ ...feed, options });
          const now = yield* Clock.currentTimeMillis;
          yield* trimUntilDone(this._feedStore.trim(feed, now), trim);
          yield* this.indexEngine.clearFeedOptionsIntents(spaceId, feedId, maxId);
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              log.warn('feed options could not be applied; retrying next pass', { spaceId, feedId, error }),
            ),
          ),
        );
      }
    }).pipe(
      Effect.catch((error) => Effect.sync(() => log.warn('feed-options intents could not be read', { error }))),
      Effect.withSpan('EchoHost.applyFeedOptionsIntents'),
    );
  }

  /** Trims every feed of each space until retention leaves nothing past a limit. */
  #trimSpaces(spaceIds: Iterable<string>): Effect.Effect<void, never, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      for (const spaceId of spaceIds) {
        const now = yield* Clock.currentTimeMillis;
        yield* trimUntilDone(this._feedStore.trimAll(spaceId, now)).pipe(
          Effect.catch((error) => Effect.sync(() => log.warn('feed retention trim failed', { spaceId, error }))),
        );
      }
    });
  }

  /** Deletes the backfill cursors the feed source reported finished. */
  #deleteFinishedBackfills(finished: ReadonlyMap<SpaceId, ReadonlySet<string>>): Effect.Effect<void, never, never> {
    return Effect.gen({ self: this }, function* () {
      for (const [spaceId, resourceIds] of finished) {
        yield* this.indexEngine.deleteFinishedCursors({
          sourceName: this._feedDataSource.sourceName,
          spaceId,
          resourceIds: [...resourceIds],
          cursor: BACKFILL_FINISHED,
        });
      }
    }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('finished backfill cursors not deleted', { error }))));
  }

  /**
   * Removes the index rows of blocks retention deleted, a bounded number per pass, and forgets each
   * batch once its rows are gone. Returns whether logged blocks remain for a later pass.
   */
  #purgeTrimmedBlocks(changes: FeedChanges): Effect.Effect<boolean, never, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      for (let batch = 0; batch < PURGE_BATCHES_PER_PASS; batch++) {
        const { maxId, blocks } = yield* this._feedStore.takeTrimmed({ limit: PURGE_BATCH });
        if (blocks.length === 0) {
          return false;
        }
        const byFeed = new Map<string, { spaceId: SpaceId; queueId: string; blocks: typeof blocks }>();
        for (const block of blocks) {
          if (!SpaceId.isValid(block.spaceId)) {
            continue;
          }
          const key = `${block.spaceId}/${block.feedId}`;
          const entry = byFeed.get(key) ?? { spaceId: block.spaceId, queueId: block.feedId, blocks: [] };
          entry.blocks.push(block);
          byFeed.set(key, entry);
        }
        for (const feed of byFeed.values()) {
          const deleted = yield* this.indexEngine.purgeFeedBlocks(feed);
          if (deleted > 0 && EntityId.isValid(feed.queueId)) {
            changes.spaceIds.add(feed.spaceId);
            changes.queueIds.add(feed.queueId);
          }
        }
        yield* this._feedStore.clearTrimmed(maxId);
        if (blocks.length < PURGE_BATCH) {
          return false;
        }
      }
      return true;
    }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('trimmed blocks could not be purged from the index; retrying next pass', { error });
          return true;
        }),
      ),
      Effect.withSpan('EchoHost.purgeTrimmedBlocks'),
    );
  }

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
    // would be dropped by the exporter rather than reaching PostHog.
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
    if (this._ctx.disposed || !this.isOpen) {
      return undefined;
    }
    const startedAt = performance.now();
    if (!this.#indexingMarked) {
      this.#indexingMarked = true;
      markMilestone('indexing.started');
    }

    try {
      const combinedResult = _makeEmptyMergedResult();
      const feedChanges = makeFeedChanges();
      const countCatchUp = this.indexStatus.beginPass();

      {
        performance.mark('indexEngine.update.automerge:start');
        // A feed append changes no document, yet the document leg reads the heads of every document and
        // every cursor to find that out; an agent turn appends many times a second.
        const scanDocuments = !this.#documentsDrained || !_onlyFeedReasons(reasons);
        const result = scanDocuments
          ? await this.indexEngine
              .update(ctx, this._automergeDataSource, { spaceId: null, limit: 50, countCatchUp })
              .pipe(EffectEx.withContext(ctx), RuntimeProvider.runPromise(this._runtime))
          : undefined;
        if (result) {
          _mergeInto(combinedResult, result);
          this.#documentsDrained = result.done && result.drained;
        }

        // Convergence-key duplicates are born from replication, and a replicated write is exactly what
        // was just indexed — so this is the earliest a duplicate can be detected on this device.
        // The trigger is the durable intent log, committed no later than the index cursors: a crash
        // or a faulted merge pass leaves the intents in place, and this pass —
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

        // After the object leg, which recorded them, and before the feed leg, so it reads under the new options.
        await this.#applyFeedOptionsIntents(feedChanges).pipe(RuntimeProvider.runPromise(this._runtime));
        performance.measure('Index Automerge', {
          start: 'indexEngine.update.automerge:start',
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'Indexing',
              trackGroup: 'ECHO', // Group related tracks together
              color: 'tertiary-dark',
              properties: [['count', result?.updated ?? 0]],
            },
          },
        });
      }
      if (this._ctx.disposed || !this.isOpen) {
        return undefined;
      }

      {
        performance.mark('indexEngine.update.queue:start');
        const result = await this.indexEngine
          .update(ctx, this._feedDataSource, { spaceId: null, limit: 50 })
          .pipe(EffectEx.withContext(ctx), RuntimeProvider.runPromise(this._runtime));
        _mergeInto(combinedResult, result);

        const report = this._feedDataSource.takeReport();
        for (const [spaceId, feedIds] of report.skippedFeeds) {
          feedChanges.spaceIds.add(spaceId);
          for (const feedId of feedIds) {
            if (EntityId.isValid(feedId)) {
              feedChanges.queueIds.add(feedId);
            }
          }
        }
        const purgeIncomplete = await Effect.gen({ self: this }, function* () {
          // An append trims in its own transaction, but at most TRIM_LIMIT blocks; the rest goes here.
          yield* this.#trimSpaces([...report.spaces]);
          yield* this.#deleteFinishedBackfills(report.finishedBackfills);
          return yield* this.#purgeTrimmedBlocks(feedChanges);
        }).pipe(RuntimeProvider.runPromise(this._runtime));
        if (purgeIncomplete) {
          combinedResult.done = false;
        }
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

      countWork('echo.indexPasses');
      countWork('echo.indexedObjects', combinedResult.updated);
      // A document is only rebuilt for its history from index state that has caught up with it.
      if (this.#historyCandidates.size > 0) {
        for (const spaceId of combinedResult.spaces) {
          this.#scheduleRetirement(spaceId);
        }
      }
      if (combinedResult.updated > 0) {
        this.#scheduleFtsFlush();
      }

      const indexHint = hintFromIndexingResult(combinedResult);
      const feedHint = hintFromFeedChanges(feedChanges);
      const hint = indexHint && feedHint ? mergeHints(indexHint, feedHint) : (indexHint ?? feedHint);
      const durationMs = performance.now() - startedAt;
      const summary = {
        reasons,
        durationMs,
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
      };
      if (durationMs >= SLOW_WORK_MS) {
        log.warn('slow index pass', summary);
      } else {
        log.verbose('indexEngine update completed', summary);
      }
      await sleep(1);
      // Invalidate queries after index update — the indexer is the sole invalidation source.
      if (hint) {
        this._queryService.invalidateQueries(hint);
      }

      if (!this._ctx.disposed && this.isOpen) {
        await this.indexStatus.afterPass(combinedResult);
      }
      if (combinedResult.drained && !this.#caughtUpMarked) {
        this.#caughtUpMarked = true;
        markMilestone('indexing.caught-up');
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
        return undefined;
      }
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
  catchUp?: number;
  spaces: Set<SpaceId>;
  queues: Set<EntityId>;
  documents: Set<string>;
  types: Set<string>;
  objects: Set<EntityId>;
};

/** Index runs a feed append starts; every other reason may follow a document save. */
const FEED_ONLY_REASONS: ReadonlySet<string> = new Set(['feed-blocks', 'trace-blocks']);

const _onlyFeedReasons = (reasons: Record<string, number>): boolean => {
  const triggers = Object.keys(reasons);
  return triggers.length > 0 && triggers.every((reason) => FEED_ONLY_REASONS.has(reason));
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
  if (r.catchUp !== undefined) {
    acc.catchUp = (acc.catchUp ?? 0) + r.catchUp;
  }
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
  | 'peerIdProvider'
  | 'getSpaceKeyByRootDocumentId'
  | 'assignQueuePositions'
  | 'useSubduction'
  | 'queryExecutor'
  | 'queryDebounce'
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
