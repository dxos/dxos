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
  type DocHandleChangePayload,
  type DocumentId,
  type DocumentProgress,
  type DocumentQuery,
  type PeerCandidatePayload,
  type PeerDisconnectedPayload,
  type PeerId,
  Repo,
  type StorageAdapterInterface,
  type StorageKey,
  type SubductionPeerBinding,
  type SubductionPeerId,
  type SubductionPolicy,
  interpretAsDocumentId,
  initSubduction,
} from '@automerge/automerge-repo';
import { type MemorySigner, type SedimentreeId } from '@automerge/automerge-subduction';
import bs58check from 'bs58check';

import { DeferredTask, Event, asyncTimeout } from '@dxos/async';
import { Context, type Lifecycle, Resource, cancelWithContext } from '@dxos/context';
import { type CollectionId, DatabaseDirectory, isEdgePeerId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { type DocHeadsList, type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { ComplexSet, bufferToArray, defaultMap, isNonNullable, range } from '@dxos/util';

import {
  type CollectionState,
  CollectionSynchronizer,
  diffCollectionStateForPeer,
  subsetRemoteToLocal,
} from './collection-synchronizer';
import { type EchoDataMonitor } from './echo-data-monitor';
import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter';
import { type AutomergeReplicator, type RemoteDocumentExistenceCheckProps } from './echo-replicator';
import { getHandleState } from './handle-state';
import { HeadsStore } from './heads-store';
import { type BeforeSaveProps, LevelDBStorageAdapter } from './leveldb-storage-adapter';

export type PeerIdProvider = () => string | undefined;

export type RootDocumentSpaceKeyProvider = (documentId: string) => PublicKey | undefined;

const SUBDUCTION_SERVICE_NAME = 'dxos-subduction';

export type AutomergeHostProps = {
  db: LevelDB;
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
};

export type LoadDocOptions = {
  timeout?: number;

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
 * Maximum amount of documents to sync in a single bundle.
 */
const BUNDLE_SIZE = 100;

/**
 * Maximum amount of concurrent tasks to run when pushing or pulling bundles.
 */
const BUNDLE_SYNC_CONCURRENCY = 2;

/**
 * If the number of documents to sync is greater than this threshold, we will use bundles.
 */
const BUNDLE_SYNC_THRESHOLD = 50;

/**
 * Only announce documents that are known to require sync.
 */
const OPTIMIZED_SHARE_POLICY = true;

/**
 * Wall-clock cap for `_repo.shutdown()` during host teardown. Healthy
 * shutdowns finish in single-digit ms; see the comment in
 * {@link AutomergeHost._close} for why the cap is still here.
 */
const CLOSE_TIMEOUT = 2_000;

/**
 * Abstracts over the AutomergeRepo.
 *
 * Runs Subduction as the document byte transport ({@link Repo.subductionAdapters}), while
 * the DXOS-specific {@link CollectionSynchronizer} rides on the same {@link EchoNetworkAdapter}
 * via `sync-request` / `sync-state` control messages that are intercepted at the adapter
 * level and never reach the Subduction sedimentree layer. Bundle sync remains available
 * for replicators that opt in.
 */
@trace.resource({ lifecycle: true })
export class AutomergeHost extends Resource {
  private readonly _db: LevelDB;
  private readonly _echoNetworkAdapter: EchoNetworkAdapter;

  private readonly _collectionSynchronizer = new CollectionSynchronizer({
    queryCollectionState: this._queryCollectionState.bind(this),
    sendCollectionState: this._sendCollectionState.bind(this),
    shouldSyncCollection: this._shouldSyncCollection.bind(this),
  });

  private _repo!: Repo;
  private _storage!: StorageAdapterInterface & Lifecycle;
  private readonly _headsStore: HeadsStore;

  private _syncTask: DeferredTask | undefined = undefined;
  /**
   * Cache of collections that would be synced on next sync task run.
   */
  private readonly _collectionsToSync = new ComplexSet<{ collectionId: string; peerId: PeerId }>(
    ({ collectionId, peerId }) => `${collectionId}|${peerId}`,
  );

  @trace.info()
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
   * Documents requested by remote peers.
   */
  private _documentsRequested = new Map<PeerId, Set<DocumentId>>();

  private _sharePolicyChangedTask?: DeferredTask;

  private _signer: MemorySigner | undefined = undefined;
  private readonly _useSubduction: boolean;

  /** Subduction Ed25519 PeerId hex → automerge-repo PeerId, populated from `subduction-peer-bound`. */
  private readonly _subductionPeerIdHexToRepoPeerId = new Map<string, PeerId>();

  constructor({
    db,
    dataMonitor,
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    useSubduction = false,
  }: AutomergeHostProps) {
    super();
    this._db = db;
    this._useSubduction = useSubduction;
    this._storage = new LevelDBStorageAdapter({
      db: db.sublevel('automerge'),
      callbacks: {
        beforeSave: async (params) => this._beforeSave(params),
        afterSave: async (key) => this._afterSave(key),
      },
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter = new EchoNetworkAdapter({
      getContainingSpaceForDocument: this._getContainingSpaceForDocument.bind(this),
      isDocumentInRemoteCollection: this._isDocumentInRemoteCollection.bind(this),
      onCollectionStateQueried: this._onCollectionStateQueried.bind(this),
      onCollectionStateReceived: this._onCollectionStateReceived.bind(this),
      // Replicators (e.g. `EchoEdgeSubductionReplicator`) call this from
      // their reconnect path; we forward to `_sharePolicyChangedTask`
      // which calls `_repo.shareConfigChanged()` on the next microtask.
      // Reuses the existing debounce so a burst of per-space reconnects
      // collapses into one `shareConfigChanged` pass.
      kickShareConfigChanged: () => this._sharePolicyChangedTask?.schedule(),
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter.documentRequested.on(({ peerId, documentId }) => {
      defaultMap(this._documentsRequested, peerId, () => new Set()).add(documentId);
      // Recovery hatch for both classical sharePolicy and subduction `authorizeFetch` denials.
      this._sharePolicyChangedTask!.schedule();
    });
    this._headsStore = new HeadsStore({ db: db.sublevel('heads') });
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

    // `Repo` unconditionally constructs a Subduction `SubductionSource` (with a fresh
    // `MemorySigner` when none is injected) regardless of whether we register any
    // `subductionAdapters`. That source's signer needs the Subduction WASM module
    // initialized first — `Repo` imports from `@automerge/automerge-subduction/slim`,
    // which does not auto-init. So WASM init runs in both modes.
    await initSubduction();

    if (this._useSubduction) {
      const { MemorySigner } = await import('@automerge/automerge-subduction');
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
      Event.wrap<SubductionPeerBinding>(this._repo as any, 'subduction-peer-bound').on(this._ctx, (binding) => {
        if ('repoPeerId' in binding) {
          this._subductionPeerIdHexToRepoPeerId.set(binding.subductionPeerId.toString(), binding.repoPeerId);
        }
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

  get peerId(): PeerId {
    return this._peerId;
  }

  get loadedDocsCount(): number {
    return Object.keys(this._repo.handles).length;
  }

  get handles(): Readonly<Record<DocumentId, DocHandle<any>>> {
    return this._repo.handles;
  }

  async addReplicator(ctx: Context, replicator: AutomergeReplicator): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.addReplicator(ctx, replicator);
  }

  async removeReplicator(replicator: AutomergeReplicator): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.removeReplicator(replicator);
  }

  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T> | null> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    // Readiness lives on the `DocumentQuery`, not the `DocHandle` — see
    // {@link getHandleState}.
    const progress = this._repo.findWithProgress<T>(documentId as DocumentId);
    const initial = progress.peek();
    if (initial.state === 'ready') {
      return initial.handle;
    }

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
    return opts?.timeout
      ? await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress), opts.timeout))
      : await cancelWithContext(ctx, this._waitForReady(progress));
  }

  /** Resolve on `'ready'`, reject on `'failed'`, treat `'unavailable'` as transient; caller bounds via `opts.timeout` / `ctx`. */
  private _waitForReady<T>(progress: DocumentProgress<T>): Promise<DocHandle<T>> {
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
    });
  }

  /**
   * Returns the live {@link DocumentQuery} for a document — exposes the
   * always-attached `DocHandle` and the actual readiness state
   * (`'loading' | 'ready' | 'unavailable' | 'failed'`) via `peek()` /
   * `subscribe()` / `whenReady()`. Use this to observe sync state without
   * forcing a wait. See {@link getHandleState} for why callers must read
   * liveness off the query rather than the `DocHandle` itself.
   */
  findWithProgress<T>(documentId: AnyDocumentId): DocumentQuery<T> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    return this._repo.findWithProgress<T>(documentId as DocumentId) as DocumentQuery<T>;
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
   * Create new persisted document.
   */
  async createDoc<T>(initialValue?: T | Doc<T> | Uint8Array, opts?: CreateDocOptions): Promise<DocHandle<T>> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    if (opts?.preserveHistory) {
      if (initialValue instanceof Uint8Array) {
        const handle = this._repo.import<T>(initialValue, { docId: opts?.documentId });
        this._createdDocuments.add(handle.documentId);
        this._sharePolicyChangedTask!.schedule();
        return handle;
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: opts?.documentId });
      this._createdDocuments.add(handle.documentId);
      this._sharePolicyChangedTask!.schedule();
      return handle;
    } else {
      if (initialValue instanceof Uint8Array) {
        throw new Error('Cannot create document from Uint8Array without preserving history');
      }

      if (opts?.documentId) {
        throw new Error('Cannot prefil document id when not importing an existing doc');
      }
      const handle = await this._repo.create2<T>(initialValue);
      this._createdDocuments.add(handle.documentId);
      this._sharePolicyChangedTask!.schedule();
      return handle;
    }
  }

  async waitUntilHeadsReplicated(ctx: Context, heads: DocHeadsList): Promise<void> {
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
          const handle = await this.loadDoc<DatabaseDirectory>(ctx, entry.documentId as DocumentId);
          invariant(handle, 'Document handle must be available when waiting for heads replication.');
          await waitForHeads(handle, entry.heads!);
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
      // `Repo.find()` resolves on `'ready'` and rejects on `'unavailable'`,
      // so the handle is guaranteed to hold data here.
      let handle: DocHandle<any>;
      try {
        handle = await this._repo.find(documentId);
      } catch (err) {
        log.error('failed to find document', { documentId, err });
        continue;
      }

      const heads = handle.heads();
      if (!heads) {
        continue;
      }
      const batch = this._db.batch();
      this._headsStore.setHeads(documentId, heads, batch);
      await batch.write();
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
      if (!allow) {
        throw new Error('authorizeFetch denied by client share policy');
      }
    },
    authorizePut: async (_requestor, _author, _sedimentreeId) => {
      // Intentionally permissive — see class-level comment above.
    },
    filterAuthorizedFetch: async (subductionPeerId, sedimentreeIds) => {
      const allowed: SedimentreeId[] = [];
      for (const sid of sedimentreeIds) {
        if (await this._shouldShareDocumentWithSubductionPeer(subductionPeerId, sid)) {
          allowed.push(sid);
        }
      }
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
    if (!repoPeerId) {
      return true;
    }
    const documentId = sedimentreeIdToDocumentId(sedimentreeId);
    return this._echoNetworkAdapter.shouldAdvertise(repoPeerId, { documentId });
  }

  private async _beforeSave({ path, batch }: BeforeSaveProps): Promise<void> {
    const handle = this._repo.handles[path[0] as DocumentId];
    if (!handle || getHandleState(this._repo, handle.documentId) !== 'ready') {
      return;
    }
    const doc = handle.doc();
    if (!doc) {
      return;
    }

    const heads = getHeads(doc);
    this._headsStore.setHeads(handle.documentId, heads, batch);
  }

  private _shouldSyncCollection(collectionId: string, peerId: PeerId): boolean {
    // Under Subduction the Repo's `peerMetadataByPeerId` is not populated for peers that only
    // speak Subduction (no classical peer message). Query the adapter directly — it maps
    // peerId -> connection and the per-connection `shouldSyncCollection` gates the answer.
    return this._echoNetworkAdapter.shouldSyncCollection(peerId, { collectionId });
  }

  /**
   * Called by AutomergeStorageAdapter after levelDB batch commit.
   */
  private async _afterSave(path: StorageKey): Promise<void> {
    if (!this.isOpen) {
      return undefined;
    }

    const documentId = path[0] as DocumentId;
    const handle = this._repo.handles[documentId];
    if (!handle) {
      return;
    }
    const document = handle.doc();
    if (!document) {
      return;
    }

    const heads = getHeads(document);
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
    const handle = this._repo.handles[documentId as any];
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
   * Flush documents to disk.
   *
   * Persists ready handles via `_repo.flush`. Head updates are published into
   * the collection synchronizer asynchronously by {@link _onHeadsChangedTask};
   * callers needing an up-to-date sync-state view should subscribe to
   * {@link collectionStateUpdated} rather than sampling immediately after flush.
   */
  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  async flush(ctx: Context, { documentIds }: FlushRequest = {}): Promise<void> {
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
   * Loaded handles are read directly; unloaded documents fall back to the {@link HeadsStore},
   * then to reconstruction from the automerge storage chunks (for docs persisted before
   * the HeadsStore was populated).
   */
  async getHeads(documentIds: DocumentId[]): Promise<(Heads | undefined)[]> {
    const result: (Heads | undefined)[] = [];
    const storeRequestIds: DocumentId[] = [];
    const storeResultIndices: number[] = [];
    for (const documentId of documentIds) {
      const handle = this._repo.handles[documentId];
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
  async getCollectionSyncState(collectionId: string): Promise<SpaceSyncState> {
    const result: SpaceSyncState = {
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

    if (different.length === 0 && missingOnLocal.length === 0 && missingOnRemote.length === 0) {
      return;
    }

    const toReplicateWithoutBatching = [...different];
    const bundleSyncEnabled = this._echoNetworkAdapter.bundleSyncEnabledForPeer(peerId);
    if (bundleSyncEnabled && missingOnRemote.length >= BUNDLE_SYNC_THRESHOLD) {
      log('pushing bundle', { amount: missingOnRemote.length });
      const { syncInteractively } = await this._pushInBundles(ctx, peerId, missingOnRemote);
      toReplicateWithoutBatching.push(...syncInteractively);
    } else {
      log.verbose('failed to push bundle, replicating interactively', {
        collectionId,
        peerId,
        amount: missingOnRemote.length,
      });
      toReplicateWithoutBatching.push(...missingOnRemote);
    }
    if (bundleSyncEnabled && missingOnLocal.length >= BUNDLE_SYNC_THRESHOLD) {
      log('pulling bundle', { amount: missingOnLocal.length });
      const { syncInteractively } = await this._pullInBundles(ctx, peerId, missingOnLocal);
      toReplicateWithoutBatching.push(...syncInteractively);
    } else {
      log.verbose('failed to pull bundle, replicating interactively', {
        collectionId,
        peerId,
        amount: missingOnLocal.length,
      });
      toReplicateWithoutBatching.push(...missingOnLocal);
    }

    if (toReplicateWithoutBatching.length === 0) {
      return;
    }

    log('replicating documents after collection sync', {
      collectionId,
      peerId,
      toReplicateWithoutBatching,
      count: toReplicateWithoutBatching.length,
    });

    // Trigger replication of the missing documents. `findWithProgress` is the
    // fire-and-forget trigger — it creates a DocHandle and attaches sources. Under classical
    // sync this triggers automerge-repo's doc-synchronizer; under Subduction it registers a
    // query for the sedimentreeId. Either way, once bytes arrive `_afterSave` populates
    // `HeadsStore` so collection sync sees the updated heads on the next diff.
    for (const documentId of toReplicateWithoutBatching) {
      this._documentsToSync.add(documentId);
      this._repo.findWithProgress(documentId as DocumentId);
    }
    this._sharePolicyChangedTask!.schedule();
  }

  // TODO(mykola): Add retries of batches https://gist.github.com/mykola-vrmchk/fde270259e9209fcbf1331e5abbf12cf
  private async _pushInBundles(
    ctx: Context,
    peerId: PeerId,
    documentIds: DocumentId[],
  ): Promise<{ syncInteractively: DocumentId[] }> {
    const documentsToPush = [...documentIds];
    const syncInteractively: DocumentId[] = [];

    // Push bundles in parallel with BUNDLE_SYNC_CONCURRENCY max concurrent tasks.
    while (documentsToPush.length > 0) {
      await Promise.all(
        range(BUNDLE_SYNC_CONCURRENCY).map(async () => {
          const bundle = documentsToPush.splice(0, BUNDLE_SIZE);
          if (bundle.length === 0) {
            return;
          }
          await this._pushBundle(ctx, peerId, bundle).catch((err) => {
            log.warn('failed to push bundle, replicating interactively', { peerId, bundle, err });
            syncInteractively.push(...bundle);
          });
        }),
      );
    }

    return { syncInteractively };
  }

  private async _pushBundle(ctx: Context, peerId: PeerId, documentIds: DocumentId[]): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }

    const docs = documentIds.map((documentId) => {
      if (getHandleState(this._repo, documentId) !== 'ready') {
        log.warn('document not ready, skipping', { documentId });
        return;
      }
      const handle = this._repo.handles[documentId];
      const doc = handle.doc();
      if (!doc) {
        log.warn('document not available, skipping', { documentId });
        return;
      }
      return {
        documentId,
        data: save(doc),
        heads: getHeads(doc),
      };
    });

    await this._echoNetworkAdapter.pushBundle(ctx, peerId, docs.filter(isNonNullable));
  }

  private async _pullInBundles(
    ctx: Context,
    peerId: PeerId,
    documentIds: DocumentId[],
  ): Promise<{ syncInteractively: DocumentId[] }> {
    const documentsToPull = [...documentIds];
    const syncInteractively: DocumentId[] = [];
    const docsToImport: Record<DocumentId, Uint8Array> = {};

    // Pull bundles in parallel with BUNDLE_SYNC_CONCURRENCY max concurrent tasks.
    while (documentsToPull.length > 0) {
      await Promise.all(
        range(BUNDLE_SYNC_CONCURRENCY).map(async () => {
          const bundle = documentsToPull.splice(0, BUNDLE_SIZE);
          if (bundle.length === 0) {
            return;
          }
          const result = await this._pullBundle(ctx, peerId, bundle).catch((err) => {
            log.warn('failed to pull bundle, replicating interactively', { peerId, bundle, err });
            syncInteractively.push(...bundle);
          });
          if (result) {
            Object.assign(docsToImport, result.docsToImport);
          }
        }),
      );
    }

    for (const [documentId, data] of Object.entries(docsToImport)) {
      this._repo.import(data, { docId: documentId as DocumentId });
    }
    await this._repo.flush(Object.keys(docsToImport) as DocumentId[]);

    return { syncInteractively };
  }

  private async _pullBundle(
    ctx: Context,
    peerId: PeerId,
    documentIds: DocumentId[],
  ): Promise<{ docsToImport: Record<DocumentId, Uint8Array> } | undefined> {
    if (this._ctx.disposed) {
      return;
    }
    // NOTE: We are expecting that documents that are being pulled are not present locally, so we are pulling all changes.
    const docHeads = Object.fromEntries(documentIds.map((documentId) => [documentId, []]));
    const bundle = await this._echoNetworkAdapter.pullBundle(ctx, peerId, docHeads);
    return { docsToImport: bundle };
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

const waitForHeads = async (handle: DocHandle<DatabaseDirectory>, heads: Heads) => {
  const unavailableHeads = new Set(heads);

  // Check the current doc first, then subscribe to `change` to catch later
  // updates. (We can't use `handle.whenReady()` to gate the subscription —
  // see {@link getHandleState} for why `DocHandle.*` state is unusable in
  // this fork.)
  const checkPresentHeads = () => {
    const doc = handle.doc();
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

  await Event.wrap<DocHandleChangePayload<DatabaseDirectory>>(handle, 'change').waitForCondition(() => {
    checkPresentHeads();
    return unavailableHeads.size === 0;
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
