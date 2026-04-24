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
  load,
  loadIncremental,
  save,
} from '@automerge/automerge';
import {
  type AnyDocumentId,
  type DocHandle,
  type DocHandleChangePayload,
  type DocumentId,
  type PeerCandidatePayload,
  type PeerDisconnectedPayload,
  type PeerId,
  Repo,
  type StorageAdapterInterface,
  type StorageKey,
  type SubductionPolicy,
  initSubduction,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import { MemorySigner, type SedimentreeId } from '@automerge/automerge-subduction';
import bs58check from 'bs58check';

import { DeferredTask, Event, asyncTimeout } from '@dxos/async';
import { Context, type Lifecycle, Resource, cancelWithContext } from '@dxos/context';
import { type CollectionId, DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { type DocHeadsList, type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { ComplexSet, bufferToArray, defaultMap, isNonNullable, range } from '@dxos/util';

import { type CollectionState, CollectionSynchronizer, diffCollectionState } from './collection-synchronizer';
import { type EchoDataMonitor } from './echo-data-monitor';
import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter';
import { type AutomergeReplicator, type RemoteDocumentExistenceCheckProps } from './echo-replicator';
import { HeadsStore } from './heads-store';
import { type BeforeSaveProps, LevelDBStorageAdapter } from './leveldb-storage-adapter';

export type PeerIdProvider = () => string | undefined;

export type RootDocumentSpaceKeyProvider = (documentId: string) => PublicKey | undefined;

export type AutomergeHostProps = {
  db: LevelDB;
  dataMonitor?: EchoDataMonitor;

  /**
   * Used for creating stable ids. A random key is generated on open, if no value is provided.
   */
  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  /**
   * Cryptographic identity used by Subduction handshakes. If omitted, a fresh
   * {@link MemorySigner} is generated on open (suitable for tests / ephemeral peers).
   */
  signer?: MemorySigner;

  /**
   * Service name used by Subduction discovery mode.
   */
  subductionServiceName?: string;
};

export type LoadDocOptions = {
  timeout?: number;

  /**
   * If true, the document will be fetched from the network if it is not found in the local storage.
   * Setting this to false does not guarantee that the document will not be fetched from the network.
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
 * Historical marker — left as an empty object since the subduction-fork `Repo.find()` no
 * longer accepts `allowableStates` / similar filters. Kept exported because external
 * callers (e.g. @dxos/blade-runner) still pass it as a second argument.
 */
export const FIND_PARAMS = {};

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
 * Extract the {@link DocumentId} that a given Subduction `SedimentreeId` was derived from.
 *
 * Mirrors `@automerge/automerge-repo/src/subduction/helpers.ts#toDocumentId`, which is an
 * internal helper not exposed via the package's `exports` field. A `SedimentreeId` is 32
 * bytes; the first 16 are the original DocumentId bytes, zero-padded to 32 (see
 * `toSedimentreeId` in the same file). We base58check-encode those 16 bytes to recover
 * the string form of the `DocumentId`.
 *
 * Returns `null` if the encoding fails — callers treat that as "unknown / reject".
 */
const sedimentreeIdToDocumentId = (sedimentreeId: SedimentreeId): DocumentId | null => {
  try {
    const bytes = sedimentreeId.toBytes().slice(0, 16);
    return bs58check.encode(bytes) as DocumentId;
  } catch (err) {
    log.warn('failed to decode sedimentreeId to documentId', { err });
    return null;
  }
};

/**
 * Abstracts over the AutomergeRepo.
 *
 * Runs Subduction as the document byte transport ({@link Repo.subductionAdapters}), while
 * the DXOS-specific {@link CollectionSynchronizer} rides on the same {@link EchoNetworkAdapter}
 * via `sync-request` / `sync-state` control messages that are intercepted at the adapter
 * level and never reach the Subduction sedimentree layer. Bundle sync remains available
 * for replicators that opt in.
 */
@trace.resource()
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

  private _signer: MemorySigner | undefined;
  private readonly _subductionServiceName: string;

  constructor({
    db,
    dataMonitor,
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
    signer,
    subductionServiceName,
  }: AutomergeHostProps) {
    super();
    this._db = db;
    this._signer = signer;
    this._subductionServiceName = subductionServiceName ?? 'dxos-subduction';
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
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter.documentRequested.on(({ peerId, documentId }) => {
      defaultMap(this._documentsRequested, peerId, () => new Set()).add(documentId);
      this._sharePolicyChangedTask?.schedule();
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

    // `Repo` unconditionally constructs a Subduction `MemorySigner`, which requires the
    // Subduction WASM module to be initialized first. `Repo` itself imports from
    // `@automerge/automerge-subduction/slim`, which does not auto-init.
    await initSubduction();

    // Generate a default signer after WASM init if none was injected.
    this._signer ??= MemorySigner.generate();

    // Construct the automerge repo with Subduction as the byte transport.
    //
    // `network: []` — no classical automerge-repo sync runs. Document bytes flow through
    // Subduction's sedimentree protocol (`subductionAdapters`). The same `EchoNetworkAdapter`
    // instance multiplexes `subduction-connection` frames (for Subduction) and
    // `sync-request` / `sync-state` frames (for `CollectionSynchronizer`) — the latter are
    // intercepted inside the adapter's `_onMessage` and never reach Subduction.
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
          serviceName: this._subductionServiceName,
          // DXOS hosts are always clients — the edge DO is the single `accept` peer in
          // the DXOS-client <-> edge topology. `connect` uses Subduction's discovery mode,
          // so peer-to-peer connections (e.g., mesh replicator, test networks) also work
          // with `connect` on both sides.
          role: 'connect',
        },
      ],
    });

    let updatingAuthScope = false;
    Event.wrap(this._echoNetworkAdapter, 'peer-candidate').on(
      this._ctx,
      ((e: PeerCandidatePayload) => !updatingAuthScope && this._onPeerConnected(e.peerId)) as any,
    );
    Event.wrap(this._echoNetworkAdapter, 'peer-disconnected').on(
      this._ctx,
      ((e: PeerDisconnectedPayload) => !updatingAuthScope && this._onPeerDisconnected(e.peerId)) as any,
    );

    this._collectionSynchronizer.remoteStateUpdated.on(this._ctx, ({ collectionId, peerId }) => {
      this._onRemoteCollectionStateUpdated(collectionId, peerId);
      this.collectionStateUpdated.emit({ collectionId: collectionId as CollectionId });
      // NOTE: Intentionally NOT calling `_echoNetworkAdapter.onConnectionAuthScopeChanged` —
      // that was a classical-sync optimization to re-run automerge-repo's share-policy for
      // newly-learned documents. Under Subduction, the adapter's `onConnectionAuthScopeChanged`
      // tears the peer down and re-adds it, which interrupts the Subduction handshake and
      // causes repeated close/reopen cycles. Subduction handles policy via its own signer /
      // policy layer, so no automerge-repo share-policy update is needed here.
    });

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
      // Under Subduction the classical share-policy machinery doesn't run, so this is a
      // no-op today. Kept as a hook so the adapter's `documentRequested` path stays
      // compatible with the main-branch wiring.
    });

    await this._echoNetworkAdapter.open();
    await this._collectionSynchronizer.open(ctx);
    await this._echoNetworkAdapter.whenConnected();
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._collectionSynchronizer.close(ctx);
    // Shut down the Repo first so Subduction's background tasks (periodic sync, hydrate,
    // heal scheduler) unwind before we close the storage adapter. Without this, those
    // tasks race with the close and surface as unhandled `LEVEL_DATABASE_NOT_OPEN` /
    // `HydrationError` rejections. `Repo.shutdown()` drains subduction sources cleanly.
    //
    // TODO(mykola): Historically this corrupted shared Subduction WASM state across
    // sequential `new Repo(...)` calls with "memory access out of bounds". Revisit if
    // that resurfaces in cross-file test runs.
    await this._repo.shutdown().catch((err) => log.warn('failed to shutdown repo', { err }));
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

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   *
   * Workaround: the subduction-fork `Repo.find()` via upstream `StorageSubsystem.loadDoc`
   * does not correctly reconstruct a document when storage has both a snapshot and one or
   * more incremental chunks (the concatenated bytes fail to parse with `loadIncremental`).
   * Symptom: handle becomes `ready` with an empty doc. Detect this case and re-seed the
   * handle by importing the fully-reconstructed bytes from our own loader.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    let handle: DocHandle<T> | undefined;
    if (typeof documentId === 'string') {
      handle = this._repo.handles[documentId as DocumentId];
    }
    if (!handle) {
      handle = await this._repo.find(documentId as DocumentId);
    }

    if (!handle.isReady()) {
      if (!opts?.timeout) {
        await cancelWithContext(ctx, handle.whenReady());
      } else {
        await cancelWithContext(ctx, asyncTimeout(handle.whenReady(), opts.timeout));
      }
    }

    await this._rehydrateFromStorageIfNeeded(handle);

    return handle;
  }

  /**
   * If the Repo's storage-source returned an empty doc but disk actually has data, reload
   * manually and apply into the handle. See `loadDoc` doc for the upstream bug context.
   */
  private async _rehydrateFromStorageIfNeeded(handle: DocHandle<unknown>): Promise<void> {
    const doc = handle.doc();
    if (doc && getHeads(doc).length > 0) {
      return;
    }
    const fresh = await this._loadDocFromStorage(handle.documentId);
    if (!fresh || getHeads(fresh).length === 0) {
      return;
    }
    handle.update(() => fresh as Doc<unknown>);
  }

  async exportDoc(id: AnyDocumentId): Promise<Uint8Array> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    const documentId = interpretAsDocumentId(id);

    const chunks = await this._storage.loadRange([documentId]);
    return bufferToArray(Buffer.concat(chunks.map((c) => c.data!)));
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
        this._sharePolicyChangedTask?.schedule();
        return handle;
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      const handle = this._repo.import(save(initialValue as Doc<T>), { docId: opts?.documentId }) as DocHandle<T>;
      this._createdDocuments.add(handle.documentId);
      this._sharePolicyChangedTask?.schedule();
      return handle;
    }

    if (initialValue instanceof Uint8Array) {
      throw new Error('Cannot create document from Uint8Array without preserving history');
    }

    if (opts?.documentId) {
      throw new Error('Cannot prefil document id when not importing an existing doc');
    }
    const handle = await this._repo.create2<T>(initialValue);
    this._createdDocuments.add(handle.documentId);
    this._sharePolicyChangedTask?.schedule();
    return handle;
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
          await waitForHeads(handle, entry.heads!);
        }),
      );
    }

    // Flush to disk handles loaded to memory also so that the indexer can pick up the changes.
    await this._repo.flush(
      documentIds.filter((documentId) => this._repo.handles[documentId] && this._repo.handles[documentId].isReady()),
    );
  }

  async reIndexHeads(documentIds: DocumentId[]): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    for (const documentId of documentIds) {
      log('re-indexing heads for document', { documentId });
      const handle = await this._repo.find(documentId);
      if (!handle.isReady()) {
        log.warn('document is not available locally, skipping', { documentId });
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
   * NOTE: Subduction replication does NOT consult `shareConfig`. It has its own policy
   * layer via `Repo({ subductionPolicy })` (see `@automerge/automerge-subduction` `Policy`
   * interface: `authorizeConnect`, `authorizeFetch`, `authorizePut`, `filterAuthorizedFetch`).
   * This object only gates what we advertise over classical sync messages traveling through
   * `networkSubsystem.send`. With the subduction-era `network: []` config, those messages
   * go nowhere; this still matters for tests / downstream callers that register classical
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
   * Authorization policy consulted by the Subduction sedimentree protocol.
   *
   * Subduction replicates documents over a separate code path from the classical
   * automerge-repo sync that `_shareConfig` gates (see `subduction-share-policy.test.ts`
   * — `shareConfig.announce` / `.access` are never invoked for subduction-only peers).
   * This object is the subduction-layer analogue of `_shareConfig`.
   *
   * Current implementation: allow-all on every hook.
   *
   * Rationale (empirically verified — see the git history of this file for the trace):
   *   - `shareConfig.access: () => true` is DXOS's existing policy. Fetch-side hooks
   *     (`authorizeFetch`, `filterAuthorizedFetch`) are called on BOTH peers during sync,
   *     so they're the direct analogue of `access`. Both must allow-all.
   *   - `shareConfig.announce` gates a DIFFERENT concern: which docs WE proactively
   *     advertise. Subduction's advertisement is automatic — there is no hook in the
   *     `Policy` interface that controls what we announce. The `OPTIMIZED_SHARE_POLICY`
   *     optimization does not have a clean subduction analogue.
   *   - `authorizePut` looks tempting as a "reject unwanted writes" gate, but DXOS's
   *     tracking sets (`_createdDocuments`, `_documentsToSync`, `_documentsToRequest`)
   *     are populated at request-time — later than when subduction pushes bytes. The
   *     receiving peer doesn't yet know the doc is wanted, so gating here rejects
   *     legitimate replication. A real port would require ahead-of-time population of
   *     an authorized-docs set, or a new upstream `Policy.authorizeAdvertise` hook.
   *
   * `sedimentreeIdToDocumentId` and the `bs58check` dependency are retained — they're
   * prerequisites for any future tightening of this policy.
   */
  private readonly _subductionPolicy: SubductionPolicy = {
    authorizeConnect: async (_peerId) => {},
    authorizeFetch: async (_peerId, _sedimentreeId) => {},
    authorizePut: async (_requestor, _author, _sedimentreeId) => {},
    filterAuthorizedFetch: async (_peerId, sedimentreeIds) => sedimentreeIds,
  };

  private async _beforeSave({ path, batch }: BeforeSaveProps): Promise<void> {
    const handle = this._repo.handles[path[0] as DocumentId];
    if (!handle || !handle.isReady()) {
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

    this.documentsSaved.emit();

    const documentId = path[0] as DocumentId;
    const handle = this._repo.handles[documentId];
    if (!handle || !handle.isReady()) {
      return;
    }
    const document = handle.doc();
    if (!document) {
      return;
    }

    const heads = getHeads(document);
    this._headsUpdates.set(documentId, heads);
    this._onHeadsChangedTask?.schedule();
  }

  @trace.info({ depth: null })
  private _automergePeers(): PeerId[] {
    return this._repo.peers;
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
    const handle = this._repo.handles[documentId as any];
    if (handle && handle.state === 'loading') {
      await handle.whenReady();
    }
    if (handle && handle.isReady() && handle.doc()) {
      const spaceKeyHex = DatabaseDirectory.getSpaceKey(handle.doc());
      if (spaceKeyHex) {
        return PublicKey.from(spaceKeyHex);
      }
    }
    /**
     * Edge case on the initial space setup.
     * A peer is maybe trying to share space root document with us after a successful invitation.
     */
    const rootDocSpaceKey = this._getSpaceKeyByRootDocumentId?.(documentId);
    if (rootDocSpaceKey) {
      return rootDocSpaceKey;
    }

    return null;
  }

  /**
   * Flush documents to disk.
   */
  @trace.span({ showInBrowserTimeline: true })
  async flush(ctx: Context, { documentIds }: FlushRequest = {}): Promise<void> {
    const loadedDocuments = (documentIds ?? Object.keys(this._repo.handles)).filter(
      (documentId): documentId is DocumentId => {
        const handle = this._repo.handles[documentId as DocumentId];
        return handle && handle.isReady();
      },
    );
    await this._repo.flush(loadedDocuments);

    // Ensure that document versions have propagated across the system.
    await this._onHeadsChangedTask?.runBlocking();
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
      if (handle && handle.isReady() && handle.doc()) {
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
        const documentId = storeRequestIds[i];
        const stored = storedHeads[i];
        if (stored) {
          result[storeResultIndices[i]] = stored;
          continue;
        }
        // Fallback: reconstruct from the automerge storage sublevel for pre-HeadsStore
        // persisted docs (no network fetch).
        const doc = await this._loadDocFromStorage(documentId);
        result[storeResultIndices[i]] = doc ? getHeads(doc) : undefined;
      }
    }
    return result;
  }

  /**
   * Reconstruct an automerge doc from its on-disk chunks without touching the network.
   *
   * `automerge-repo`'s `StorageSubsystem` writes chunks under keys shaped like
   * `[documentId, 'snapshot' | 'incremental' | 'sync-state', hash]`. A doc may have:
   * - one or more snapshot chunks (after a compaction the old snapshot is usually removed,
   *   but occasionally multiple can coexist during a compaction race),
   * - zero or more incremental chunks (`saveSince` deltas applied on top).
   *
   * Applying concatenated bytes through `A.load` yields invalid headers; instead we
   * load each snapshot, then fold in each incremental via `A.loadIncremental`.
   */
  private async _loadDocFromStorage(documentId: DocumentId): Promise<Doc<unknown> | undefined> {
    const chunks = await this._storage.loadRange([documentId]);
    if (chunks.length === 0) {
      return undefined;
    }

    const snapshots = chunks.filter((chunk) => chunk.key[1] === 'snapshot');
    const incrementals = chunks.filter((chunk) => chunk.key[1] === 'incremental');

    let doc: Doc<unknown> | undefined;
    try {
      for (const snapshot of snapshots) {
        if (!snapshot.data || snapshot.data.length === 0) {
          continue;
        }
        if (!doc) {
          doc = load(snapshot.data);
        } else {
          doc = loadIncremental(doc, snapshot.data);
        }
      }
      for (const incremental of incrementals) {
        if (!incremental.data || incremental.data.length === 0) {
          continue;
        }
        if (!doc) {
          doc = load(incremental.data);
        } else {
          doc = loadIncremental(doc, incremental.data);
        }
      }
    } catch (err) {
      log.warn('failed to load document from storage', { documentId, err });
      return undefined;
    }

    return doc;
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
      const diff = diffCollectionState(localState, state);
      result.peers!.push({
        peerId,
        missingOnRemote: diff.missingOnRemote.length,
        missingOnLocal: diff.missingOnLocal.length,
        differentDocuments: diff.different.length,
        localDocumentCount: Object.entries(localState.documents).filter(([_, heads]) => heads.length > 0).length,
        remoteDocumentCount: Object.entries(state.documents).filter(([_, heads]) => heads.length > 0).length,
        totalDocumentCount: new Set([...Object.keys(localState.documents), ...Object.keys(state.documents)]).size,
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

    const { different, missingOnLocal, missingOnRemote } = diffCollectionState(localState, remoteState);

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
      count: toReplicateWithoutBatching.length,
    });

    // Trigger Subduction to fetch/announce the missing documents. `findWithProgress` is the
    // fire-and-forget trigger — it creates a DocHandle, the Subduction source registers a
    // query for the sedimentreeId, and once bytes arrive `_afterSave` populates `HeadsStore`
    // so collection sync sees the updated heads on the next diff.
    for (const documentId of toReplicateWithoutBatching) {
      this._documentsToSync.add(documentId);
      this._repo.findWithProgress(documentId as DocumentId);
    }
    this._sharePolicyChangedTask?.schedule();
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
      const handle = this._repo.handles[documentId];
      if (!handle || !handle.isReady()) {
        log.warn('document not ready, skipping', { documentId });
        return;
      }
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
        if (documentId in state.documents) {
          if (!newState) {
            newState = structuredClone(state);
          }
          newState.documents[documentId] = heads;
        }
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

  await handle.whenReady();
  await Event.wrap<DocHandleChangePayload<DatabaseDirectory>>(handle, 'change').waitForCondition(() => {
    // Check if unavailable heads became available.
    for (const changeHash of unavailableHeads.values()) {
      if (changeIsPresentInDoc(handle.doc()!, changeHash)) {
        unavailableHeads.delete(changeHash);
      }
    }

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
