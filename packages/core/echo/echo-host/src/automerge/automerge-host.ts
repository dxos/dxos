//
// Copyright 2023 DXOS.org
//

import {
  type Doc,
  type Heads,
  getBackend,
  getHeads,
  equals as headsEquals,
  isAutomerge,
  save,
} from '@automerge/automerge';
import {
  type AnyDocumentId,
  type DocHandle,
  type DocumentId,
  type DocumentProgress,
  type PeerCandidatePayload,
  type PeerDisconnectedPayload,
  type PeerId,
  Repo,
  type StorageKey,
  type SubductionPeerBinding,
  type SubductionPeerId,
  type SubductionPolicy,
  initSubduction,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import { type MemorySigner, type SedimentreeId } from '@automerge/automerge-subduction';
import bs58check from 'bs58check';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { DeferredTask, Event, asyncTimeout } from '@dxos/async';
import { Context, Resource, cancelWithContext } from '@dxos/context';
import { type CollectionId, DatabaseDirectory, createIdFromSpaceKey, isEdgePeerId } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService } from '@dxos/protocols/rpc';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { trace } from '@dxos/tracing';
import { ComplexSet, bufferToArray, defaultMap } from '@dxos/util';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

import {
  type CollectionState,
  CollectionSynchronizer,
  diffCollectionStateForPeer,
  subsetRemoteToLocal,
} from './collection-synchronizer.ts';
import { type DocumentLease, DocumentLeaseRegistry } from './document-lease.ts';
import { type EchoDataMonitor } from './echo-data-monitor.ts';
import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter.ts';
import { type AutomergeReplicator, type RemoteDocumentExistenceCheckProps } from './echo-replicator.ts';
import { type HandleQueryState, getHandleState } from './handle-state.ts';
import { tryGetSpaceIdFromCollectionId } from './space-collection.ts';
import { SqliteHeadsStore } from './sqlite-heads-store.ts';
import { SqliteStorageAdapter, SUBDUCTION_KEY_FAMILIES, SUBDUCTION_PREFIX } from './sqlite-storage-adapter.ts';

export type PeerIdProvider = () => string | undefined;

export type RootDocumentSpaceKeyProvider = (documentId: string) => PublicKey | undefined;

const SUBDUCTION_SERVICE_NAME = 'dxos-subduction';

export type AutomergeHostProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  dataMonitor?: EchoDataMonitor;

  /**
   * Used for creating stable ids. A random key is generated on open, if no value is provided.
   */
  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  /**
   * Enable Subduction sedimentree transport.
   *
   * When `false` (default), the host wires {@link EchoNetworkAdapter} as a classical
   * automerge-repo network adapter and skips all Subduction-specific initialization
   * (WASM init, signer generation, subduction policy / adapters). When `true`, the
   * host runs Subduction as the document byte transport.
   */
  useSubduction?: boolean;

  /**
   * Residency policy for loaded documents. Defaults suit a long-lived process; a host whose
   * invocations are shorter than {@link EVICT_IDLE_DELAY} (a Worker) or whose budget is tighter
   * than {@link MIN_RESIDENT_DOCUMENTS} documents should set its own.
   */
  residency?: {
    /** How long a document stays resident after its last lease is disposed. */
    evictionDelay?: number;
    /** How many released documents stay resident regardless of age. */
    minResidentDocuments?: number;
  };
};

export type LoadDocOptions = {
  timeout?: number;

  /** Internal: set on the one retry `_loadLeasedDoc` takes after an eviction raced its wait. */
  retried?: boolean;

  /**
   * Controls whether `loadDoc` is allowed to wait on the network.
   *
   * - `true` / unset (default): announce that we want the doc and wait
   *   until any source (storage OR network) delivers it.
   * - `false`: probe local storage only. If chunks for the doc exist
   *   on disk, wait for storage to populate the handle; otherwise
   *   throw `'unavailable'` immediately without ever consulting the
   *   network. Note that this does not guarantee that the document
   *   will not be fetched from the network — an inbound peer announce
   *   can still deliver bytes — but the host will never request it.
   */
  fetchFromNetwork?: boolean;
};

export type CreateDocOptions = {
  /**
   * Import the document together with its history.
   */
  preserveHistory?: boolean;

  documentId?: DocumentId;
};

/**
 * Only announce documents that are known to require sync.
 */
const OPTIMIZED_SHARE_POLICY = true;

/**
 * Consecutive non-converging collection-sync passes before warning, at a ~10s poll — ~1min, so
 * in-flight replication of a large document does not trip it.
 */
const NON_CONVERGENCE_WARN_THRESHOLD = 6;

/**
 * Passes between repeat non-convergence warnings, so a permanently stuck pair stays visible in a
 * short log-buffer window without emitting the diagnostic on every poll.
 */
const NON_CONVERGENCE_WARN_INTERVAL = 30;

/**
 * Wall-clock cap for `_repo.shutdown()` during host teardown. Healthy
 * shutdowns finish in single-digit ms; see the comment in
 * {@link AutomergeHost._close} for why the cap is still here.
 */
const CLOSE_TIMEOUT = 2_000;

/**
 * How long an eviction waits for a document that is still loading. A document only reaches disk once
 * it settles, so dropping one mid-load would discard memory-only data; one that never arrives costs
 * an empty handle and is left resident.
 */
const EVICT_SETTLE_TIMEOUT = 2_000;

/**
 * How long a document being replicated after a collection-sync diff stays leased. A peer can
 * advertise a document it never delivers, so the wait cannot be unbounded.
 */
const REPLICATION_LEASE_TIMEOUT = 30_000;

/** Bounds a re-index load, so one document no peer serves cannot stall the whole pass. */
const REINDEX_LOAD_TIMEOUT = 10_000;

/**
 * How long a document stays resident after its last lease is disposed. Long enough to span the gap
 * between two passes over the same working set (indexing then querying it), because re-faulting a
 * document allocates automerge memory the runtime never gives back.
 */
const EVICT_IDLE_DELAY = 30_000;

/**
 * How many released documents stay resident regardless of age. Keeps the hot working set loaded on a
 * host whose whole session is shorter than {@link EVICT_IDLE_DELAY}.
 */
const MIN_RESIDENT_DOCUMENTS = 256;

/**
 * Abstracts over the AutomergeRepo.
 *
 * Runs Subduction as the document byte transport ({@link Repo.subductionAdapters}), while
 * the DXOS-specific {@link CollectionSynchronizer} rides on the same {@link EchoNetworkAdapter}
 * via `sync-request` / `sync-state` control messages that are intercepted at the adapter
 * level and never reach the Subduction sedimentree layer.
 */
export class AutomergeHost extends Resource {
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  private readonly _echoNetworkAdapter: EchoNetworkAdapter;

  private readonly _collectionSynchronizer = new CollectionSynchronizer({
    queryCollectionState: this._queryCollectionState.bind(this),
    sendCollectionState: this._sendCollectionState.bind(this),
    shouldSyncCollection: this._shouldSyncCollection.bind(this),
  });

  private _repo!: Repo;
  private _storage!: SqliteStorageAdapter;
  private readonly _headsStore: SqliteHeadsStore;

  private _syncTask: DeferredTask | undefined = undefined;
  /**
   * Cache of collections that would be synced on next sync task run.
   */
  private readonly _collectionsToSync = new ComplexSet<{ collectionId: string; peerId: PeerId }>(
    ({ collectionId, peerId }) => `${collectionId}|${peerId}`,
  );

  private _peerId!: PeerId;

  private readonly _peerIdProvider?: PeerIdProvider;
  private readonly _getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  public readonly collectionStateUpdated = new Event<{ collectionId: CollectionId }>();

  /**
   * Fired after a batch of documents was saved to disk.
   */
  public readonly documentsSaved = new Event();

  private readonly _headsUpdates = new Map<DocumentId, Heads>();
  private _onHeadsChangedTask?: DeferredTask;

  /**
   * Documents created in this session.
   */
  private _createdDocuments = new Set<DocumentId>();

  /**
   * Documents that need to be synced based on the result of collection-sync.
   */
  private _documentsToSync = new Set<DocumentId>();

  /**
   * Documents that are not available locally that should be requested.
   */
  private _documentsToRequest = new Set<DocumentId>();

  /**
   * Consecutive non-converging collection-sync passes, keyed by `<collectionId>:<peerId>` — a pair
   * making no progress is otherwise indistinguishable from idle polling in the logs.
   */
  private _nonConvergingSyncPasses = new Map<string, number>();

  /**
   * Documents requested by remote peers.
   */
  private _documentsRequested = new Map<PeerId, Set<DocumentId>>();

  /**
   * Reference counts the documents held loaded. The repo caches a document forever once anything
   * faults it in, so residency is decided here instead — see {@link DocumentLeaseRegistry}.
   */
  private readonly _leases: DocumentLeaseRegistry;

  /**
   * Leases held for documents being replicated after a collection-sync diff, released when the
   * document settles: the trigger is fire-and-forget, so nothing else holds the document while its
   * bytes are in flight.
   */
  private readonly _replicationLeases = new Map<DocumentId, DocumentLease>();

  private _sharePolicyChangedTask?: DeferredTask;

  private _signer: MemorySigner | undefined = undefined;
  private readonly _useSubduction: boolean;

  /** Subduction Ed25519 PeerId hex → automerge-repo PeerId, populated from `subduction-peer-bound`. */
  private readonly _subductionPeerIdHexToRepoPeerId = new Map<string, PeerId>();

  constructor({
    runtime,
    dataMonitor,
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    useSubduction = false,
    residency,
  }: AutomergeHostProps) {
    super();
    this._leases = new DocumentLeaseRegistry({
      open: (documentId) => {
        const query = this._repo.findWithProgress(documentId);
        const handle = this._repo.getHandle(documentId);
        invariant(handle, 'Document query has no attached handle.');
        return { query, handle };
      },
      evict: (documentId, isCancelled) => this._evictDocument(documentId, isCancelled),
      evictionDelay: residency?.evictionDelay ?? EVICT_IDLE_DELAY,
      minResidentDocuments: residency?.minResidentDocuments ?? MIN_RESIDENT_DOCUMENTS,
    });
    this._runtime = runtime;
    this._useSubduction = useSubduction;
    this._storage = new SqliteStorageAdapter({
      runtime,
      callbacks: {
        afterSave: async (key) => this._afterSave(key),
      },
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter = new EchoNetworkAdapter({
      getContainingSpaceForDocument: this._getContainingSpaceForDocument.bind(this),
      getContainingSpaceIdForDocument: this.getContainingSpaceIdForDocument.bind(this),
      isDocumentInRemoteCollection: this._isDocumentInRemoteCollection.bind(this),
      onCollectionStateQueried: this._onCollectionStateQueried.bind(this),
      onCollectionStateReceived: this._onCollectionStateReceived.bind(this),
      onConnectionOpen: () => this._sharePolicyChangedTask?.schedule(),
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter.documentRequested.on(({ peerId, documentId }) => {
      defaultMap(this._documentsRequested, peerId, () => new Set()).add(documentId);
      // Recovery hatch for both classical sharePolicy and subduction `authorizeFetch` denials.
      this._sharePolicyChangedTask!.schedule();
    });
    this._headsStore = new SqliteHeadsStore({ runtime });
    this._peerIdProvider = peerIdProvider;
    this._getSpaceKeyByRootDocumentId = getSpaceKeyByRootDocumentId;
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._peerId = `host-${this._peerIdProvider?.() ?? PublicKey.random().toHex()}` as PeerId;

    this._onHeadsChangedTask = new DeferredTask(this._ctx, async () => {
      const docHeads = Array.from(this._headsUpdates.entries());
      this._headsUpdates.clear();
      this._onHeadsChanged(docHeads);
    });

    await this._storage.open?.();

    // Tables must exist before the Repo constructor calls loadRange() on the storage adapter.
    await RuntimeProvider.runPromise(this._runtime)(this.migrate);

    // `Repo` unconditionally constructs a Subduction `SubductionSource` (with a fresh
    // `MemorySigner` when none is injected) regardless of whether we register any
    // `subductionAdapters`. That source's signer needs the Subduction WASM module
    // initialized first — `Repo` imports from `@automerge/automerge-subduction/slim`,
    // which does not auto-init. So WASM init runs in both modes.
    await initSubduction();

    if (this._useSubduction) {
      const { MemorySigner, setSubductionLogLevel } = await import('@automerge/automerge-subduction');
      this._signer ??= MemorySigner.generate();

      this._repo = new Repo({
        peerId: this._peerId as PeerId,
        shareConfig: this._shareConfig,
        subductionPolicy: this._subductionPolicy,
        storage: this._storage,
        network: [],
        signer: this._signer,
        subductionAdapters: [
          {
            adapter: this._echoNetworkAdapter,
            serviceName: SUBDUCTION_SERVICE_NAME,
            // DXOS hosts are always clients — the edge DO is the single `accept` peer in
            // the DXOS-client <-> edge topology. `connect` uses Subduction's discovery mode,
            // so peer-to-peer connections (e.g., mesh replicator, test networks) also work
            // with `connect` on both sides.
            role: 'connect',
          },
        ],
      });

      // Capture the subduction ↔ repo PeerId binding (websocket arm has no repoPeerId; unused).
      Event.wrap<SubductionPeerBinding>(this._repo, 'subduction-peer-bound').on(this._ctx, (binding) => {
        if ('repoPeerId' in binding) {
          this._subductionPeerIdHexToRepoPeerId.set(binding.subductionPeerId.toString(), binding.repoPeerId);
        }
      });

      // Quiet subduction_core's console WARNs: every per-sedimentree sync round fans out to all
      // space-scoped edge peers, and each correct cross-space `authorizeFetch` denial is logged by
      // the WASM at WARN ("not authorized to access sedimentree"), flooding the console. Must run
      // after `new Repo(...)` — the SubductionSource constructor resets the level to 'warn' on
      // every startup. Skipped when subduction debugging is requested, mirroring the constructor's
      // own escape hatch (`localStorage.debug` / `__SUBDUCTION_DEBUG`).
      const subductionDebugRequested =
        (typeof localStorage !== 'undefined' &&
          typeof localStorage.getItem === 'function' &&
          /subduction/i.test(localStorage.getItem('debug') ?? '')) ||
        Boolean(Reflect.get(globalThis, '__SUBDUCTION_DEBUG'));
      if (!subductionDebugRequested) {
        setSubductionLogLevel('error');
      }
      // Recorded so a log bundle states whether sedimentree-level warnings were being dropped.
      log('subduction log level', {
        level: subductionDebugRequested ? 'warn' : 'error',
        suppressed: !subductionDebugRequested,
        enableWith: "localStorage.debug='subduction'",
      });
    } else {
      // Classical automerge-repo wiring: the EchoNetworkAdapter is registered as a
      // network adapter and document bytes flow through the standard sync protocol.
      // `Repo` will internally construct an unused `MemorySigner` for its always-on
      // `SubductionSource`; with no `subductionAdapters` passed in that source has no
      // peers to talk to, so it's effectively dormant.
      this._repo = new Repo({
        peerId: this._peerId as PeerId,
        shareConfig: this._shareConfig,
        storage: this._storage,
        network: [this._echoNetworkAdapter],
      });
    }

    let updatingAuthScope = false;
    Event.wrap(this._echoNetworkAdapter, 'peer-candidate').on(
      this._ctx,
      ((e: PeerCandidatePayload) => !updatingAuthScope && this._onPeerConnected(e.peerId)) as any,
    );
    Event.wrap(this._echoNetworkAdapter, 'peer-disconnected').on(
      this._ctx,
      ((e: PeerDisconnectedPayload) => !updatingAuthScope && this._onPeerDisconnected(e.peerId)) as any,
    );

    this._collectionSynchronizer.peerCollectionStateUpdated.on(
      this._ctx,
      ({ collectionId, peerId, newDocsAppeared }) => {
        this._onRemoteCollectionStateUpdated(collectionId, peerId);
        this.collectionStateUpdated.emit({ collectionId: collectionId as CollectionId });
        if (!this._useSubduction && newDocsAppeared) {
          updatingAuthScope = true;
          try {
            this._echoNetworkAdapter.onConnectionAuthScopeChanged(peerId);
          } finally {
            updatingAuthScope = false;
          }
        }
      },
    );

    this._syncTask = new DeferredTask(this._ctx, async () => {
      const collectionToSync = Array.from(this._collectionsToSync.values());
      this._collectionsToSync.clear();
      if (collectionToSync.length === 0) {
        return;
      }
      await Promise.all(
        collectionToSync.map(async ({ collectionId, peerId }) => {
          try {
            await this._handleCollectionSync(this._ctx, collectionId, peerId);
          } catch (err) {
            log.error('failed to sync collection', { collectionId, peerId, err });
          }
        }),
      );
    });

    this._sharePolicyChangedTask = new DeferredTask(this._ctx, async () => {
      log('share policy changed');
      this._repo.shareConfigChanged();
    });

    await this._echoNetworkAdapter.open();
    await this._collectionSynchronizer.open(ctx);
    await this._echoNetworkAdapter.whenConnected();
  }

  protected override async _close(ctx: Context): Promise<void> {
    // Closed before the repo shuts down: unloading one document at a time on the way out is wasted
    // work, and an eviction racing the shutdown would flush into a closed storage adapter.
    for (const lease of this._replicationLeases.values()) {
      lease[Symbol.dispose]();
    }
    this._replicationLeases.clear();
    await this._leases.closeAndSettle();

    // Drain any in-flight `_onHeadsChangedTask` before the `Resource` base
    // disposes `this._ctx`.
    await this._onHeadsChangedTask?.join();

    await this._collectionSynchronizer.close(ctx);

    // In subduction mode `_repo.shutdown()` can stall for ~30s on a
    // Rust-side bug: `subduction_core` doesn't reject pending
    // `RequestId`s on disconnect, so an in-flight `addBatch(...)` to a
    // now-gone peer waits the full per-request timeout. Capping drops
    // only never-going-to-be-delivered pushes; local commits are
    // already durable in the subduction storage bridge. Reproducer:
    // `collection synchronization is bidirectional` in
    // `automerge-host-subduction.test.ts`.
    //
    // Classical mode doesn't hit that bug. It does need the explicit
    // `flush()` (saves docs to local storage) and the full
    // `shutdown()` to drain pending sync messages, otherwise a peer
    // about to forward our last writes to a third party can miss the
    // space-root doc (reproducer: `delegated > single-use` in
    // `spaces-invitations.test.ts`).
    if (this._useSubduction) {
      await asyncTimeout(this._repo.shutdown(), CLOSE_TIMEOUT).catch((err) =>
        log.warn('failed to shutdown repo', { err }),
      );
    } else {
      await this._repo.flush().catch((err) => log.warn('failed to flush repo before shutdown', { err }));
      await this._repo.shutdown().catch((err) => log.warn('failed to shutdown repo', { err }));
    }
    await this._storage.close?.();
    await this._echoNetworkAdapter.close();
    this._syncTask = undefined;
    this._onHeadsChangedTask = undefined;
    this._sharePolicyChangedTask = undefined;
  }

  /**
   * Creates automerge_chunks and automerge_heads tables if they do not exist.
   * Must be called (via RuntimeProvider.runPromise) before opening the host.
   */
  get migrate(): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> {
    return this._storage.migrate.pipe(Effect.andThen(this._headsStore.migrate));
  }

  get peerId(): PeerId {
    return this._peerId;
  }

  get loadedDocsCount(): number {
    return Object.keys(this._repo.handles).length;
  }

  /** Ids of the documents resident in the repo cache — ids only, so no caller can bypass a lease. */
  get loadedDocumentIds(): DocumentId[] {
    return Object.keys(this._repo.handles) as DocumentId[];
  }

  /**
   * Cached handles owned by one space — residency, not the space's document count.
   *
   * Counted by testing the space's collection state (which survives handle eviction, and is the
   * same mapping `getContainingSpaceIdForDocument` trusts first) against the repo's cache, rather
   * than by asking each cached handle which space it belongs to: that lookup can await a load, and
   * a stats call must not fault documents in.
   */
  loadedDocsCountForSpace(spaceId: SpaceId): number {
    const counted = new Set<string>();
    for (const collectionId of this._collectionSynchronizer.getRegisteredCollectionIds()) {
      if (tryGetSpaceIdFromCollectionId(collectionId) !== spaceId) {
        continue;
      }
      const state = this._collectionSynchronizer.getLocalCollectionState(collectionId);
      if (!state) {
        continue;
      }
      // A space registers a collection per root, so the same document can appear more than once.
      for (const documentId of Object.keys(state.documents)) {
        if (!counted.has(documentId) && this._repo.getHandle(documentId as DocumentId) !== undefined) {
          counted.add(documentId);
        }
      }
    }
    return counted.size;
  }

  get storage(): SqliteStorageAdapter {
    return this._storage;
  }

  async addReplicator(ctx: Context, replicator: AutomergeReplicator): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.addReplicator(ctx, replicator);
  }

  async removeReplicator(replicator: AutomergeReplicator): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.removeReplicator(replicator);
  }

  /**
   * Leases a document, waiting until it is loaded. The lease is the only route to a `DocHandle`;
   * dispose it (`using`, or in the holder's teardown) so the document can be evicted.
   *
   * Returns null when `fetchFromNetwork: false` and the document is not on disk.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocumentLease<T> | null> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    // Leased before the wait, so the document cannot be evicted between becoming ready and the
    // caller receiving it.
    const lease = this.acquireDoc<T>(documentId);
    let settled = false;
    try {
      const result = await this._loadLeasedDoc(ctx, lease, opts);
      settled = result !== null;
      return result;
    } finally {
      if (!settled) {
        lease[Symbol.dispose]();
      }
    }
  }

  /**
   * Leases a document without waiting for it to load — the lease's query carries the readiness
   * state. Faults the document in, so a caller that only wants to know whether it is already
   * resident must not use this.
   */
  acquireDoc<T>(documentId: AnyDocumentId): DocumentLease<T> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    // A lease is over the whole live document, so a heads pin or a path scope in the URL would be
    // silently dropped rather than honoured.
    invariant(
      typeof documentId !== 'string' || !(documentId.includes('#') || documentId.includes('/')),
      'A lease cannot be taken on a heads-pinned or path-scoped URL.',
    );
    return this._leases.acquire<T>(interpretAsDocumentId(documentId));
  }

  /** Documents currently leased — what the host holds because something is using it. */
  get leasedDocsCount(): number {
    return this._leases.size;
  }

  /** Settles pending evictions, for a caller measuring residency. */
  async drainEvictions(): Promise<void> {
    await this._leases.drain();
  }

  /**
   * Drops a document from the repo cache, draining its pending save so it cannot re-persist.
   * Resolves `false` when the document was left resident, so the registry retries it later.
   */
  private async _evictDocument(documentId: DocumentId, isCancelled: () => boolean): Promise<boolean> {
    if (!this.isOpen) {
      return false;
    }
    // Only a loaded document is evicted: `_repo.flush` persists ready handles, so dropping one that
    // is still loading would discard data that is only in memory.
    if (getHandleState(this._repo, documentId) !== 'ready') {
      const abort = new AbortController();
      await asyncTimeout(
        this._waitForReady(this._repo.findWithProgress(documentId), abort.signal),
        EVICT_SETTLE_TIMEOUT,
      )
        .catch((err) => log('document did not settle before eviction', { documentId, err }))
        .finally(() => abort.abort());
      if (getHandleState(this._repo, documentId) !== 'ready') {
        log('deferred eviction of a document that is not loaded', { documentId });
        return false;
      }
    }
    await this._repo.flush([documentId]);
    // Re-leased while this was draining: dropping the handle now would hand its holder an empty
    // document to read.
    if (isCancelled()) {
      log('cancelled eviction of a re-leased document', { documentId });
      return false;
    }
    if (this._repo.handles[documentId]) {
      await this._repo.removeFromCache(documentId);
    }
    log('evicted document', { documentId });
    return true;
  }

  private async _loadLeasedDoc<T>(
    ctx: Context,
    lease: DocumentLease<T>,
    opts?: LoadDocOptions,
  ): Promise<DocumentLease<T> | null> {
    if (lease.state === 'ready') {
      return lease;
    }
    // Readiness lives on the `DocumentQuery`, not the `DocHandle` — see {@link getHandleState}. The
    // query is read from the repo rather than through the lease, which does not hand it out.
    const progress = this._repo.findWithProgress<T>(lease.documentId);

    // Default: when `fetchFromNetwork` is unset, behave as if it were
    // `true` — wait on any source. Only an explicit `false` activates
    // the storage-only branch.
    if (opts?.fetchFromNetwork !== false) {
      // Network branch: announce that we want the doc, then fall through
      // to the wait below; any source may deliver it. `_documentsToRequest`
      // is a classical-sync announce optimization (subduction's fingerprint
      // exchange doesn't need it); `shareConfigChanged()` is useful in both
      // modes.
      if (!this._useSubduction) {
        this._documentsToRequest.add(progress.documentId);
      }
      this._sharePolicyChangedTask!.schedule();
    } else {
      // Note: This is a Hack.
      // Storage-only branch. The subduction fork's `DocumentQuery` merged
      // storage/network into a single `'loading'` state, so we can't tell
      // them apart via `progress.peek()`. Workaround: probe storage
      // directly and throw `'unavailable'` if nothing is on disk, without
      // ever scheduling a network announce. See `fetchFromNetwork` JSDoc
      // for the residual inbound-announce race.
      // TODO(mykola): replace with per-source state inspection once the
      // patched fork exposes it on `DocumentProgress`.
      const chunks = await this._storage.loadRange([progress.documentId]);
      const onDisk = chunks.some((chunk) => chunk.data && chunk.data.length > 0);
      if (!onDisk) {
        return null;
      }
    }

    // `_waitForReady` (vs `progress.whenReady()`) treats `'unavailable'` as transient — the query routinely transits through it when classical sync sees `peers.size === 0` before the next peer arrives.
    if (opts?.timeout) {
      const abort = new AbortController();
      try {
        await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort.signal), opts.timeout));
      } finally {
        abort.abort();
      }
    } else {
      const abort = new AbortController();
      try {
        await cancelWithContext(ctx, this._waitForReady(progress, abort.signal));
      } finally {
        abort.abort();
      }
    }
    // Re-read through the lease: an eviction of the same document may have completed during the wait,
    // in which case the query that just reported ready is not the one the lease now resolves. Bounded
    // to one retry, so an evict/re-fault oscillation cannot re-arm the caller's timeout forever.
    if (getHandleState(this._repo, lease.documentId) !== 'ready' && !opts?.retried) {
      return await this._loadLeasedDoc(ctx, lease, { ...opts, retried: true });
    }
    return lease;
  }

  /**
   * Resolve on `'ready'`, reject on `'failed'`, treat `'unavailable'` as transient; caller bounds via
   * `opts.timeout` / `ctx`.
   *
   * `signal` unsubscribes an abandoned wait: a bounded caller stops awaiting but the query lives on,
   * so without it a document that never settles gains a subscriber per attempt.
   */
  private _waitForReady<T>(progress: DocumentProgress<T>, signal?: AbortSignal): Promise<DocHandle<T>> {
    const peeked = progress.peek();
    if (peeked.state === 'ready') {
      return Promise.resolve(peeked.handle);
    }
    if (peeked.state === 'failed') {
      return Promise.reject(peeked.error);
    }
    return new Promise<DocHandle<T>>((resolve, reject) => {
      const unsubscribe = progress.subscribe((state) => {
        if (state.state === 'ready') {
          unsubscribe();
          resolve(state.handle);
        } else if (state.state === 'failed') {
          unsubscribe();
          reject(state.error);
        }
        // `'unavailable'` and `'loading'` are non-terminal — keep waiting.
      });
      signal?.addEventListener('abort', () => {
        unsubscribe();
        reject(signal.reason instanceof Error ? signal.reason : new Error('Wait for document aborted.'));
      });
    });
  }

  async exportDoc(id: AnyDocumentId): Promise<Uint8Array> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    const documentId = interpretAsDocumentId(id);

    const chunks = await this._storage.loadRange([documentId]);
    return bufferToArray(Buffer.concat(chunks.map((c) => c.data!)));
  }

  /**
   * Probe local storage to determine whether the document has any persisted
   * chunks. Does not request the document from the network and does not
   * touch the in-memory `Repo`. Returns `true` iff at least one non-empty
   * chunk exists on disk for the document.
   *
   * Intended for query-driven (disk-only) loads that need to know quickly
   * whether a document is locally available without waiting on network
   * latency. See `DocumentsSynchronizer.addDocuments` and the `requesting`
   * transition in `DocHandleProxy`.
   */
  async hasDocOnDisk(id: AnyDocumentId): Promise<boolean> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    const documentId = interpretAsDocumentId(id);
    const chunks = await this._storage.loadRange([documentId]);
    return chunks.some((chunk) => chunk.data != null && chunk.data.length > 0);
  }

  /**
   * Wipe a document from local storage: its automerge chunks and its heads-store row (both, or the
   * heads row is orphaned). Used by garbage collection for documents that are no longer reachable
   * from any space directory.
   */
  async removeDocument(id: AnyDocumentId): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    const documentId = interpretAsDocumentId(id);
    // Evicted first, draining its pending save, so the handle cannot re-persist what is deleted
    // below — collection loads the document to check ownership, so one is usually live here.
    if (this._repo.handles[documentId]) {
      await this._repo.removeFromCache(documentId);
    }
    // Dropped from the registry too: the document is about to stop existing, so a later eviction of
    // it would re-create — and re-announce — the query this call deletes.
    this._leases.forget(documentId);

    // One transaction: the orphan scan enumerates the heads table, so chunks outliving their heads
    // row could never be found again.
    const sedimentreeId = documentIdToSedimentreeIdHex(documentId);
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen({ self: this }, function* () {
        const transaction = yield* SqlTransaction.SqlTransaction;
        yield* transaction.withTransaction(
          Effect.gen({ self: this }, function* () {
            yield* this._headsStore.remove(documentId);
            yield* this._storage.removeRangeEffect([documentId]);
            for (const family of SUBDUCTION_KEY_FAMILIES) {
              yield* this._storage.removeRangeEffect([SUBDUCTION_PREFIX, family, sedimentreeId]);
            }
          }),
        );
      }),
    );

    // The classical share policy answers from these, so an id left behind keeps being announced.
    this._createdDocuments.delete(documentId);
    this._documentsToSync.delete(documentId);
    this._documentsToRequest.delete(documentId);
    this._headsUpdates.delete(documentId);
    for (const requested of this._documentsRequested.values()) {
      requested.delete(documentId);
    }
  }

  /**
   * Create new persisted document.
   */
  async createDoc<T>(initialValue?: T | Doc<T> | Uint8Array, opts?: CreateDocOptions): Promise<DocumentLease<T>> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    if (opts?.preserveHistory) {
      if (initialValue instanceof Uint8Array) {
        const handle = this._repo.import<T>(initialValue, { docId: opts?.documentId });
        return this._afterCreate<T>(handle.documentId);
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: opts?.documentId });
      return this._afterCreate<T>(handle.documentId);
    } else {
      if (initialValue instanceof Uint8Array) {
        throw new Error('Cannot create document from Uint8Array without preserving history');
      }

      if (opts?.documentId) {
        throw new Error('Cannot prefil document id when not importing an existing doc');
      }
      const handle = await this._repo.create2<T>(initialValue);
      return this._afterCreate<T>(handle.documentId);
    }
  }

  /** Leases a freshly created document and announces it, so the creator holds it until it lets go. */
  private _afterCreate<T>(documentId: DocumentId): DocumentLease<T> {
    this._createdDocuments.add(documentId);
    this._sharePolicyChangedTask!.schedule();
    return this._leases.acquire<T>(documentId);
  }

  async waitUntilHeadsReplicated(ctx: Context, heads: DataService.DocHeadsList): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    const entries = heads.entries;
    if (!entries?.length) {
      return;
    }
    const documentIds = entries.map((entry) => entry.documentId as DocumentId);
    const documentHeads = await this.getHeads(documentIds);
    const headsToWait = entries.filter((entry, index) => {
      const targetHeads = entry.heads;
      if (!targetHeads || targetHeads.length === 0) {
        return false;
      }
      const currentHeads = documentHeads[index];
      return !(currentHeads !== null && currentHeads !== undefined && headsEquals(currentHeads, targetHeads));
    });
    if (headsToWait.length > 0) {
      await Promise.all(
        headsToWait.map(async (entry) => {
          using lease = await this.loadDoc<DatabaseDirectory>(ctx, entry.documentId as DocumentId);
          invariant(lease, 'Document handle must be available when waiting for heads replication.');
          await waitForHeads(lease, entry.heads!);
        }),
      );
    }

    // Flush to disk handles loaded to memory also so that the indexer can pick up the changes.
    await this._repo.flush(documentIds.filter((documentId) => getHandleState(this._repo, documentId) === 'ready'));
  }

  async reIndexHeads(documentIds: DocumentId[]): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    for (const documentId of documentIds) {
      log('re-indexing heads for document', { documentId });
      // Bounded: `loadDoc` treats `'unavailable'` as transient, so a document no peer serves would
      // otherwise block every document after it.
      let lease: DocumentLease<any> | null;
      try {
        lease = await this.loadDoc(Context.default(), documentId, { timeout: REINDEX_LOAD_TIMEOUT });
      } catch (err) {
        log.error('failed to find document', { documentId, err });
        continue;
      }
      if (!lease) {
        continue;
      }
      using _lease = lease;

      const heads = lease.heads();
      if (!heads) {
        continue;
      }
      await RuntimeProvider.runPromise(this._runtime)(this._headsStore.setHeads(documentId, heads));
    }
    log('done re-indexing heads');
  }

  /**
   * Share policy for the Repo's classical automerge-repo sync path (CollectionSynchronizer /
   * DocSynchronizer — see `src/synchronizer/DocSynchronizer.ts#resolveSharePolicy`).
   *
   * NOTE: Subduction replication does NOT consult `shareConfig`.
   * {@link AutomergeReplicator}s via {@link EchoNetworkAdapter}.
   */
  private readonly _shareConfig = {
    access: async (_peerId: PeerId, _documentId?: DocumentId): Promise<boolean> => {
      // Access-on-request is always allowed; per-doc authorization happens in the replicator.
      return true;
    },

    // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
    // Hosts, running in the worker, don't share documents unless requested by other peers.
    // NOTE: If both peers return sharePolicy=false the replication will not happen
    // https://github.com/automerge/automerge-repo/pull/292
    // Called for all loaded documents so they could be advertised to the sync server.
    announce: async (peerId: PeerId, documentId?: DocumentId): Promise<boolean> => {
      if (!documentId) {
        return false;
      }

      if (OPTIMIZED_SHARE_POLICY) {
        if (
          !this._createdDocuments.has(documentId) &&
          !this._documentsToSync.has(documentId) &&
          !this._documentsToRequest.has(documentId)
        ) {
          // Skip advertising documents that don't need to be synced.
          return false;
        }
      }

      const peerMetadata = this._repo.peerMetadataByPeerId[peerId];
      if (isEchoPeerMetadata(peerMetadata)) {
        return this._echoNetworkAdapter.shouldAdvertise(peerId, { documentId });
      }

      return false;
    },
  };

  /**
   * Subduction sedimentree authorization policy. Mirrors {@link _shareConfig.announce}
   * on the OUTBOUND side (`authorizeFetch`, `filterAuthorizedFetch`) via the same
   * per-connection `shouldAdvertise` predicate on `_echoNetworkAdapter`.
   *
   * `authorizePut` is intentionally allow-all to mirror classical sync (`useSubduction:
   * false`), which has no inbound gate. Gating inbound here creates a bootstrapping
   * deadlock during invitations: the joining peer's `_getContainingSpaceForDocument`
   * cannot resolve the space-root doc until it's loaded, which can't happen if the
   * inbound write is denied — and subduction `authorizePut` denials are sticky on the
   * receiver (see .claude/skills/subduction/SKILL.md), so the entry never recovers.
   * Inbound trust here is bounded by `authorizeFetch` on the sender side (peers can't
   * push docs we wouldn't have served them) and by the sedimentree's internal
   * cryptographic structure.
   */
  private readonly _subductionPolicy: SubductionPolicy = {
    authorizeConnect: async (_subductionPeerId) => {
      // Per-document gating below; no per-peer kill-switch.
    },
    authorizeFetch: async (subductionPeerId, sedimentreeId) => {
      const allow = await this._shouldShareDocumentWithSubductionPeer(subductionPeerId, sedimentreeId);
      // The throw below is the only record of a denial, and the peer's matching WASM warning is
      // suppressed (see `_open`), so a refused document is otherwise invisible on both sides.
      log.verbose('subduction authorizeFetch', {
        documentId: sedimentreeIdToDocumentId(sedimentreeId),
        subductionPeerId: subductionPeerId.toString(),
        allow,
      });
      if (!allow) {
        throw new Error('authorizeFetch denied by client share policy');
      }
    },
    authorizePut: async (_requestor, _author, sedimentreeId) => {
      // Intentionally permissive — see class-level comment above. Logged because this is the
      // only signal that a peer actually delivered changes for a document.
      log.verbose('subduction authorizePut', { documentId: sedimentreeIdToDocumentId(sedimentreeId) });
    },
    filterAuthorizedFetch: async (subductionPeerId, sedimentreeIds) => {
      const allowed: SedimentreeId[] = [];
      const denied: string[] = [];
      for (const sid of sedimentreeIds) {
        if (await this._shouldShareDocumentWithSubductionPeer(subductionPeerId, sid)) {
          allowed.push(sid);
        } else {
          denied.push(sedimentreeIdToDocumentId(sid));
        }
      }
      // Silently dropping ids from the response would otherwise leave no trace of the omission.
      log.verbose('subduction filterAuthorizedFetch', {
        subductionPeerId: subductionPeerId.toString(),
        requested: sedimentreeIds.length,
        allowed: allowed.length,
        denied,
      });
      return allowed;
    },
  };

  /**
   * Translates subduction PeerId → repo PeerId and delegates to the per-connection
   * `shouldAdvertise`. Default-allow when the binding hasn't arrived yet (narrow race
   * window: the handshake event fires before any sedimentree sync round).
   */
  private async _shouldShareDocumentWithSubductionPeer(
    subductionPeerId: SubductionPeerId,
    sedimentreeId: SedimentreeId,
  ): Promise<boolean> {
    const subductionPeerIdHex = subductionPeerId.toString();
    const repoPeerId = this._subductionPeerIdHexToRepoPeerId.get(subductionPeerIdHex);
    const documentId = sedimentreeIdToDocumentId(sedimentreeId);
    if (!repoPeerId) {
      // Default-allow on the unbound-peer race; logged because it bypasses the share policy.
      log.verbose('subduction share probe: peer not bound, allowing', { documentId, subductionPeerIdHex });
      return true;
    }
    const allow = await this._echoNetworkAdapter.shouldAdvertise(repoPeerId, { documentId });
    log.verbose('subduction share probe', { documentId, peerId: repoPeerId, allow });
    return allow;
  }

  private _shouldSyncCollection(collectionId: string, peerId: PeerId): boolean {
    // Under Subduction the Repo's `peerMetadataByPeerId` is not populated for peers that only
    // speak Subduction (no classical peer message). Query the adapter directly — it maps
    // peerId -> connection and the per-connection `shouldSyncCollection` gates the answer.
    return this._echoNetworkAdapter.shouldSyncCollection(peerId, { collectionId });
  }

  /**
   * Called by SqliteStorageAdapter after a chunk is committed to SQLite.
   * Updates heads store and schedules collection sync notification.
   */
  private async _afterSave(path: StorageKey): Promise<void> {
    if (!this.isOpen) {
      return undefined;
    }

    if (path[0] === SUBDUCTION_PREFIX) {
      // Subduction keys are `[prefix, family, sedimentreeId, ...]`, so they carry no documentId and
      // fall through the handle lookup below unnoticed. A `remote-heads` write is the only
      // persisted evidence that a head exchange with a peer completed for a document.
      const [, family, sedimentreeId] = path;
      if (family === 'remote-heads' && sedimentreeId) {
        log.verbose('subduction remote-heads persisted', {
          documentId: sedimentreeHexToDocumentId(sedimentreeId),
          sedimentreeId,
        });
      }
      return;
    }

    const documentId = path[0] as DocumentId;
    const handle = this._repo.getHandle(documentId);
    if (!handle) {
      return;
    }
    const document = handle.doc();
    if (!document) {
      return;
    }

    const heads = getHeads(document);

    // Persist heads to SQLite. Non-atomic with the chunk save but recoverable:
    // heads can be reconstructed from chunks via reIndexHeads on restart.
    await RuntimeProvider.runPromise(this._runtime)(this._headsStore.setHeads(documentId, heads));

    this._headsUpdates.set(documentId, heads);
    invariant(this._onHeadsChangedTask, 'onHeadsChangedTask is not initialized');
    this._onHeadsChangedTask.schedule();
    this.documentsSaved.emit();
  }

  private async _isDocumentInRemoteCollection(params: RemoteDocumentExistenceCheckProps): Promise<boolean> {
    for (const collectionId of this._collectionSynchronizer.getRegisteredCollectionIds()) {
      const remoteCollections = this._collectionSynchronizer.getRemoteCollectionStates(collectionId);
      const remotePeerDocs = remoteCollections.get(params.peerId as PeerId)?.documents;
      if (remotePeerDocs && params.documentId in remotePeerDocs) {
        return true;
      }
    }
    return false;
  }

  private async _getContainingSpaceForDocument(documentId: string): Promise<PublicKey | null> {
    // This runs inside share-policy resolution (see `MeshEchoReplicator.shouldAdvertise` ->
    // `_shareConfig.announce` -> `DocSynchronizer.#resolveSharePolicy`). It must NOT block
    // on the document becoming ready: under classical sync the network source's availability
    // is itself gated on share policy returning, so awaiting `progress.whenReady()` here
    // deadlocks the load (the document never transitions out of `'loading'`).
    //
    // Read the spaceKey iff the document is already loaded; otherwise let the share policy
    // fall through to the `_getSpaceKeyByRootDocumentId` lookup or the
    // `isDocumentInRemoteCollection` check on the caller.
    const handle = this._repo.getHandle(documentId as any);
    if (handle && getHandleState(this._repo, documentId as DocumentId) === 'ready') {
      const doc = handle.doc();
      if (doc) {
        const spaceKeyHex = DatabaseDirectory.getSpaceKey(doc);
        if (spaceKeyHex) {
          return PublicKey.from(spaceKeyHex);
        }
      }
    }

    // Edge case on initial space setup: a peer may be sharing the space root document
    // with us after a successful invitation, before our local handle has any data.
    const rootDocSpaceKey = this._getSpaceKeyByRootDocumentId?.(documentId);
    if (rootDocSpaceKey) {
      return rootDocSpaceKey;
    }

    return null;
  }

  /**
   * Resolve the space id owning a document for the share policy.
   *
   * Membership is answered first from the local collection state — the space root's document
   * list (root + linked docs), maintained by `updateLocalCollectionState`. That mapping survives
   * handle eviction and never blocks on the document loading, so a doc the node owns but whose
   * handle is evicted or still `'loading'` resolves to its space instead of reading as "not in any
   * space" and producing a spurious `authorizeFetch`/share-policy denial (logged by the peer as
   * `not authorized to access sedimentree`). This must stay synchronous for the same reason
   * `_getContainingSpaceForDocument` refuses to await the load: the network source's availability
   * is itself gated on the share policy returning, so awaiting the document here would deadlock.
   *
   * Falls back to the document's own embedded space key (loaded handle) / the root-doc lookup for
   * a doc not yet linked into any local collection (e.g. inbound during initial sync).
   */
  async getContainingSpaceIdForDocument(documentId: string): Promise<SpaceId | null> {
    for (const collectionId of this._collectionSynchronizer.getRegisteredCollectionIds()) {
      const state = this._collectionSynchronizer.getLocalCollectionState(collectionId);
      if (!state || !(documentId in state.documents)) {
        continue;
      }
      // Only space collections (`space:<spaceId>[:<root>]`) carry a resolvable owner; a non-space
      // collection id yields null (rather than throwing on the share-policy path) and the scan
      // continues to the next registered collection.
      const spaceId = tryGetSpaceIdFromCollectionId(collectionId);
      if (spaceId) {
        return spaceId;
      }
    }

    const spaceKey = await this._getContainingSpaceForDocument(documentId);
    return spaceKey ? createIdFromSpaceKey(spaceKey) : null;
  }

  /**
   * Flush documents to disk.
   *
   * Persists ready handles via `_repo.flush`. Head updates are published into
   * the collection synchronizer asynchronously by {@link _onHeadsChangedTask};
   * callers needing an up-to-date sync-state view should subscribe to
   * {@link collectionStateUpdated} rather than sampling immediately after flush.
   */
  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  async flush(ctx: Context, { documentIds }: DataService.FlushRequest = {}): Promise<void> {
    if (!this.isOpen) {
      return;
    }
    const loadedDocuments = (documentIds ?? Object.keys(this._repo.handles)).filter(
      (documentId): documentId is DocumentId => getHandleState(this._repo, documentId as DocumentId) === 'ready',
    );
    await this._repo.flush(loadedDocuments);
  }

  /**
   * Returns current heads of each requested document.
   *
   * Loaded handles are read directly; unloaded documents fall back to the {@link SqliteHeadsStore},
   * then to reconstruction from the automerge storage chunks (for docs persisted before
   * the SqliteHeadsStore was populated).
   */
  async getHeads(documentIds: DocumentId[]): Promise<(Heads | undefined)[]> {
    const result: (Heads | undefined)[] = [];
    const storeRequestIds: DocumentId[] = [];
    const storeResultIndices: number[] = [];
    for (const documentId of documentIds) {
      const handle = this._repo.getHandle(documentId);
      if (handle && getHandleState(this._repo, documentId) === 'ready' && handle.doc()) {
        result.push(getHeads(handle.doc()!));
      } else {
        storeRequestIds.push(documentId);
        storeResultIndices.push(result.length);
        result.push(undefined);
      }
    }
    if (storeRequestIds.length > 0) {
      const storedHeads = await this._headsStore.getHeads(storeRequestIds);
      for (let i = 0; i < storedHeads.length; i++) {
        result[storeResultIndices[i]] = storedHeads[i];
      }
    }
    return result;
  }

  /**
   * Iterate over all document heads stored on disk.
   */
  listDocumentHeads(): AsyncGenerator<{ documentId: DocumentId; heads: Heads }> {
    return this._headsStore.iterateAll();
  }

  //
  // Collection sync.
  //

  getLocalCollectionState(collectionId: string): CollectionState | undefined {
    return this._collectionSynchronizer.getLocalCollectionState(collectionId);
  }

  getRemoteCollectionStates(collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return this._collectionSynchronizer.getRemoteCollectionStates(collectionId);
  }

  refreshCollection(collectionId: string): void {
    this._collectionSynchronizer.refreshCollection(collectionId);
  }

  /**
   * Snapshot of local-vs-remote collection state for the given collectionId.
   *
   * Eventually consistent. A single emission via `collectionStateUpdated` may
   * reflect stale local heads if a local save is mid-propagation through
   * `_onHeadsChangedTask` (the deferred task that publishes `_afterSave` head
   * updates into `_collectionSynchronizer`). The follow-up emission from
   * `_onHeadsChanged` will reflect the up-to-date heads. Consumers must not
   * treat any single emission as authoritative; subscribe to the stream and
   * converge.
   *
   */
  async getCollectionSyncState(collectionId: string): Promise<DataService.SpaceSyncState> {
    const result: DataService.SpaceSyncState = {
      peers: [],
    };

    const localState = this.getLocalCollectionState(collectionId);
    const remoteState = this.getRemoteCollectionStates(collectionId);

    if (!localState) {
      return result;
    }

    for (const [peerId, state] of remoteState) {
      const isEdgePeer = isEdgePeerId(peerId);
      // For edge peers, intersect the remote view with the local key set so
      // edge orphans (sedimentrees the edge still knows about but the local
      // root no longer references) don't inflate counts or appear unsynced.
      const effectiveRemote = isEdgePeer ? subsetRemoteToLocal(localState, state) : state;
      const diff = diffCollectionStateForPeer(localState, state, { isEdgePeer });
      result.peers!.push({
        peerId,
        missingOnRemote: diff.missingOnRemote.length,
        missingOnLocal: diff.missingOnLocal.length,
        differentDocuments: diff.different.length,
        localDocumentCount: Object.entries(localState.documents).filter(([_, heads]) => heads.length > 0).length,
        remoteDocumentCount: Object.entries(effectiveRemote.documents).filter(([_, heads]) => heads.length > 0).length,
        totalDocumentCount: new Set([...Object.keys(localState.documents), ...Object.keys(effectiveRemote.documents)])
          .size,
        unsyncedDocumentCount: new Set([...diff.missingOnLocal, ...diff.missingOnRemote, ...diff.different]).size,
      });
    }

    return result;
  }

  /**
   * Update the local collection state based on the locally stored document heads.
   */
  async updateLocalCollectionState(collectionId: string, documentIds: DocumentId[]): Promise<void> {
    const heads = await this.getHeads(documentIds);
    const documents: Record<DocumentId, Heads> = Object.fromEntries(
      heads.map((heads, index) => [documentIds[index], heads ?? []]),
    );
    this._collectionSynchronizer.setLocalCollectionState(collectionId, { documents });
    // Notify subscribers (e.g. data-service `subscribeSpaceSyncState`) that local state changed.
    // `setLocalCollectionState` only emits `peerCollectionStateUpdated` for peers that already
    // have a recorded remote state; on a fresh space (no remote yet) the membership refresh
    // would otherwise be silent and subscribers would never wake up. The sibling local-write
    // path in `_onHeadsChanged` follows the same "mutate, then emit" pattern.
    this.collectionStateUpdated.emit({ collectionId: collectionId as CollectionId });

    // Proactively push our updated local state to peers that are interested in this collection.
    // This reduces reliance on the next periodic query and prevents replication stalls in fast
    // paths where the remote queries before our local state is ready.
    const interestedPeers = this._echoNetworkAdapter.getPeersInterestedInCollection(collectionId);
    if (interestedPeers.length > 0) {
      for (const peerId of interestedPeers) {
        this._sendCollectionState(collectionId, peerId, { documents });
      }
    }
  }

  async clearLocalCollectionState(collectionId: string): Promise<void> {
    this._collectionSynchronizer.clearLocalCollectionState(collectionId);
  }

  private _onCollectionStateQueried(collectionId: string, peerId: PeerId): void {
    this._collectionSynchronizer.onCollectionStateQueried(collectionId, peerId);
  }

  private _onCollectionStateReceived(collectionId: string, peerId: PeerId, state: unknown): void {
    this._collectionSynchronizer.onRemoteStateReceived(collectionId, peerId, decodeCollectionState(state));
  }

  private _queryCollectionState(collectionId: string, peerId: PeerId): void {
    this._echoNetworkAdapter.queryCollectionState(collectionId, peerId);
  }

  private _sendCollectionState(collectionId: string, peerId: PeerId, state: CollectionState): void {
    this._echoNetworkAdapter.sendCollectionState(collectionId, peerId, encodeCollectionState(state));
  }

  private _onPeerConnected(peerId: PeerId): void {
    this._collectionSynchronizer.onConnectionOpen(peerId);
  }

  private _onPeerDisconnected(peerId: PeerId): void {
    // Passes are only consecutive within one connection.
    for (const syncKey of this._nonConvergingSyncPasses.keys()) {
      if (syncKey.endsWith(`:${peerId}`)) {
        this._nonConvergingSyncPasses.delete(syncKey);
      }
    }
    this._collectionSynchronizer.onConnectionClosed(peerId);
  }

  private _onRemoteCollectionStateUpdated(collectionId: string, peerId: PeerId): void {
    this._collectionsToSync.add({ collectionId, peerId });
    this._syncTask?.schedule();
  }

  private async _handleCollectionSync(ctx: Context, collectionId: string, peerId: PeerId) {
    const localState = this._collectionSynchronizer.getLocalCollectionState(collectionId);
    const remoteState = this._collectionSynchronizer.getRemoteCollectionStates(collectionId).get(peerId);

    if (!localState || !remoteState) {
      return;
    }

    const { different, missingOnLocal, missingOnRemote } = diffCollectionStateForPeer(localState, remoteState, {
      isEdgePeer: isEdgePeerId(peerId),
    });

    const syncKey = `${collectionId}:${peerId}`;
    if (different.length === 0 && missingOnLocal.length === 0 && missingOnRemote.length === 0) {
      this._nonConvergingSyncPasses.delete(syncKey);
      return;
    }

    // Both sides' heads, so a stuck document is diagnosable from a log bundle alone.
    const passes = (this._nonConvergingSyncPasses.get(syncKey) ?? 0) + 1;
    this._nonConvergingSyncPasses.set(syncKey, passes);
    const overThreshold = passes - NON_CONVERGENCE_WARN_THRESHOLD;
    if (overThreshold >= 0 && overThreshold % NON_CONVERGENCE_WARN_INTERVAL === 0) {
      log.warn('collection sync not converging', {
        collectionId,
        peerId,
        passes,
        missingOnLocal,
        missingOnRemote,
        different,
        localHeads: Object.fromEntries(different.map((documentId) => [documentId, localState.documents[documentId]])),
        remoteHeads: Object.fromEntries(different.map((documentId) => [documentId, remoteState.documents[documentId]])),
        // Subduction addresses documents by sedimentree id, so without this a log bundle cannot be
        // searched for the diverged document's storage or policy activity.
        sedimentreeIds: Object.fromEntries(
          different.map((documentId) => [documentId, documentIdToSedimentreeIdHex(documentId)]),
        ),
        handleStates: Object.fromEntries(
          different.map((documentId) => [documentId, getHandleState(this._repo, documentId)]),
        ),
      });
    }

    const toReplicate = [...different, ...missingOnRemote, ...missingOnLocal];

    if (toReplicate.length === 0) {
      return;
    }

    // Per-handle state included: a document stuck in `unavailable`/`loading` here on every diff
    // pass is the signature of a subduction DocumentQuery parked without retry —
    // `findWithProgress` will not re-issue the query, so the doc never arrives.
    log('replicating documents after collection sync', {
      collectionId,
      peerId,
      count: toReplicate.length,
      handleStates: Object.fromEntries(
        toReplicate.map((documentId) => [documentId, getHandleState(this._repo, documentId)]),
      ),
    });

    // Trigger replication of the missing documents. `findWithProgress` is the
    // fire-and-forget trigger — it creates a DocHandle and attaches sources. Under classical
    // sync this triggers automerge-repo's doc-synchronizer; under Subduction it registers a
    // query for the sedimentreeId. Either way, once bytes arrive `_afterSave` populates
    // `SqliteHeadsStore` so collection sync sees the updated heads on the next diff.
    for (const documentId of toReplicate) {
      // `findWithProgress` resolves from the existing query for an already-`ready` document and
      // `_documentsToSync` feeds a share policy Subduction does not consult, so a diverged
      // document reaching here gets no retry from either — the diff simply repeats next pass.
      if (this._useSubduction && getHandleState(this._repo, documentId) === 'ready' && different.includes(documentId)) {
        // Verbose: this fires on every diff pass for docs that are in practice fully synced,
        // so at warn level it floods the console without indicating a real fault.
        log.verbose('diverged document has no subduction retry path', {
          collectionId,
          peerId,
          documentId,
          sedimentreeId: documentIdToSedimentreeIdHex(documentId),
        });
      }
      this._documentsToSync.add(documentId);
      this._leaseUntilSettled(documentId as DocumentId);
    }
    this._sharePolicyChangedTask!.schedule();
  }

  /**
   * Leases a document until its query settles, which both triggers replication and keeps the
   * document resident while its bytes are in flight — nothing else holds it until they land.
   *
   * Bounded by {@link REPLICATION_LEASE_TIMEOUT} rather than waiting for `'ready'` forever: a peer
   * can advertise a document it never delivers, and `'unavailable'` is transient here (the query
   * reports it whenever no source can serve the document *yet*), so it cannot be the release signal.
   */
  private _leaseUntilSettled(documentId: DocumentId): void {
    if (this._replicationLeases.has(documentId)) {
      return;
    }
    const lease = this.acquireDoc(documentId);
    this._replicationLeases.set(documentId, lease);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      clearTimeout(timer);
      if (this._replicationLeases.delete(documentId)) {
        lease[Symbol.dispose]();
      }
    };
    const settled = (state: HandleQueryState) => state === 'ready' || state === 'failed';
    if (settled(lease.state)) {
      release();
      return;
    }
    const unsubscribe = lease.subscribe(({ state }) => {
      if (settled(state)) {
        unsubscribe();
        release();
      }
    });
    timer = setTimeout(() => {
      log('replication lease expired before the document settled', { documentId });
      unsubscribe();
      release();
    }, REPLICATION_LEASE_TIMEOUT);
  }

  private _onHeadsChanged(docHeads: [DocumentId, Heads][]): void {
    const collectionsChanged = new Set<CollectionId>();

    for (const collectionId of this._collectionSynchronizer.getRegisteredCollectionIds()) {
      const state = this._collectionSynchronizer.getLocalCollectionState(collectionId);
      if (!state) {
        continue;
      }
      let newState: CollectionState | undefined;

      for (const [documentId, heads] of docHeads) {
        const current = state.documents[documentId];
        // Collection membership is owned by `updateLocalCollectionState` (driven by
        // `SpaceStateManager.spaceDocumentListUpdated`). `_afterSave` fires for every
        // chunk written — including the space root, system docs, and transiently-fetched
        // docs that haven't been admitted to any collection — so we only refresh heads
        // for documents the membership path has already registered. Adding new keys
        // here would leak non-collection docs into the broadcast state and race with
        // the authoritative rebuild in `updateLocalCollectionState`.
        if (current === undefined) {
          continue;
        }
        if (headsEquals(current, heads)) {
          continue;
        }
        if (!newState) {
          newState = structuredClone(state);
        }
        newState.documents[documentId] = heads;
      }

      if (newState) {
        this._collectionSynchronizer.setLocalCollectionState(collectionId, newState);
        collectionsChanged.add(collectionId as CollectionId);
      }
    }

    for (const collectionId of collectionsChanged) {
      this.collectionStateUpdated.emit({ collectionId });
    }
  }
}

const waitForHeads = async (lease: DocumentLease<DatabaseDirectory>, heads: Heads) => {
  const unavailableHeads = new Set(heads);

  // Check the current doc first, then subscribe to `change` to catch later
  // updates. (We can't use the handle's readiness to gate the subscription —
  // see {@link getHandleState} for why `DocHandle.*` state is unusable in
  // this fork.)
  const checkPresentHeads = () => {
    const doc = lease.doc();
    if (!doc) {
      return;
    }
    for (const changeHash of unavailableHeads.values()) {
      if (changeIsPresentInDoc(doc, changeHash)) {
        unavailableHeads.delete(changeHash);
      }
    }
  };

  checkPresentHeads();
  if (unavailableHeads.size === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    const onChange = () => {
      checkPresentHeads();
      if (unavailableHeads.size === 0) {
        lease.off('change', onChange);
        resolve();
      }
    };
    lease.on('change', onChange);
  });
};

const changeIsPresentInDoc = (doc: Doc<any>, changeHash: string): boolean => {
  return !!getBackend(doc).getChangeByHash(changeHash);
};

const decodeCollectionState = (state: unknown): CollectionState => {
  invariant(typeof state === 'object' && state !== null, 'Invalid state');

  return state as CollectionState;
};

const encodeCollectionState = (state: CollectionState): unknown => {
  return state;
};

/**
 * Inverse of `toSedimentreeId` in `@automerge/automerge-repo/src/subduction/helpers.ts`:
 * truncate the 32-byte SedimentreeId to its first 16 bytes and base58check-encode.
 */
const sedimentreeIdToDocumentId = (sedimentreeId: SedimentreeId): DocumentId =>
  bs58check.encode(sedimentreeId.toBytes().slice(0, 16)) as DocumentId;

/**
 * The sedimentree id `SubductionStorageBridge` embeds in its storage keys: the 16-byte DocumentId
 * zero-padded to 32, lowercase hex. Derived arithmetically so sweeping never requires the
 * subduction WASM module to be initialized; `sqlite-storage-adapter.test.ts` pins the two against
 * each other.
 */
/**
 * Inverse of {@link documentIdToSedimentreeIdHex}, for naming the document behind a storage key.
 * Decodes the leading 16 bytes by hand — `Buffer` is not available in the browser worker.
 */
const sedimentreeHexToDocumentId = (sedimentreeIdHex: string): DocumentId => {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index++) {
    bytes[index] = Number.parseInt(sedimentreeIdHex.slice(index * 2, index * 2 + 2), 16);
  }
  return bs58check.encode(bytes) as DocumentId;
};

export const documentIdToSedimentreeIdHex = (documentId: DocumentId): string => {
  const bytes = new Uint8Array(32);
  bytes.set(bs58check.decode(documentId).subarray(0, 16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
