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
  type PeerId,
  Repo,
  type StorageAdapterInterface,
  initSubduction,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import { MemorySigner } from '@automerge/automerge-subduction';

import { Event, asyncTimeout } from '@dxos/async';
import { Context, type Lifecycle, Resource, cancelWithContext } from '@dxos/context';
import { type CollectionId, DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { type DocHeadsList, type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { bufferToArray } from '@dxos/util';

import { type CollectionState } from './collection-synchronizer';
import { type EchoDataMonitor } from './echo-data-monitor';
import { EchoNetworkAdapter } from './echo-network-adapter';
import { type AutomergeReplicator } from './echo-replicator';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

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
 * Abstracts over the AutomergeRepo with Subduction as the sync transport.
 *
 * Subduction handles:
 * - Document discovery.
 * - Delta / full sync between peers.
 * - Per-document replication state.
 *
 * The legacy DXOS `CollectionSynchronizer` / `HeadsStore` / bundle-sync code paths
 * were removed; the corresponding public methods now return empty / no-op values.
 * TODO(mykola): Remove these shims once downstream callers migrate.
 */
@trace.resource()
export class AutomergeHost extends Resource {
  private readonly _db: LevelDB;
  private readonly _echoNetworkAdapter: EchoNetworkAdapter;

  private _repo!: Repo;
  private _storage!: StorageAdapterInterface & Lifecycle;

  @trace.info()
  private _peerId!: PeerId;

  private readonly _peerIdProvider?: PeerIdProvider;
  private readonly _getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  public readonly collectionStateUpdated = new Event<{ collectionId: CollectionId }>();

  /**
   * Fired after a batch of documents was saved to disk.
   */
  public readonly documentsSaved = new Event();

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
        // Subduction-era: no HeadsStore to maintain here; we just need to notify listeners
        // that a batch landed so `EchoHost` can invalidate queries and re-run the indexer.
        beforeSave: async () => {},
        afterSave: async () => {
          if (this.isOpen) {
            this.documentsSaved.emit();
          }
        },
      },
      monitor: dataMonitor,
    });
    this._echoNetworkAdapter = new EchoNetworkAdapter({
      getContainingSpaceForDocument: this._getContainingSpaceForDocument.bind(this),
      monitor: dataMonitor,
    });
    this._peerIdProvider = peerIdProvider;
    this._getSpaceKeyByRootDocumentId = getSpaceKeyByRootDocumentId;
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._peerId = `host-${this._peerIdProvider?.() ?? PublicKey.random().toHex()}` as PeerId;

    await this._storage.open?.();

    // `Repo` unconditionally constructs a Subduction `MemorySigner`, which requires
    // the Subduction WASM module to be initialized first. `Repo` itself imports from
    // `@automerge/automerge-subduction/slim`, which does not auto-init.
    await initSubduction();

    // Generate a default signer after WASM init if none was injected.
    this._signer ??= MemorySigner.generate();

    this._repo = new Repo({
      peerId: this._peerId as PeerId,
      shareConfig: this._shareConfig,
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

    await this._echoNetworkAdapter.open();
    await this._echoNetworkAdapter.whenConnected();
  }

  protected override async _close(ctx: Context): Promise<void> {
    // TODO(mykola): Ideally we would `await this._repo.shutdown()` here, but calling
    // it corrupts shared Subduction WASM state across sequential test instances
    // ("memory access out of bounds" on next `new Repo(...)`). Subduction background
    // tasks may still try to write to the about-to-be-closed LevelDB; filed upstream.
    await this._storage.close?.();
    await this._echoNetworkAdapter.close();
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
        return this._repo.import(initialValue, { docId: opts?.documentId });
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      return this._repo.import(save(initialValue as Doc<T>), { docId: opts?.documentId }) as DocHandle<T>;
    }

    if (initialValue instanceof Uint8Array) {
      throw new Error('Cannot create document from Uint8Array without preserving history');
    }

    if (opts?.documentId) {
      throw new Error('Cannot prefil document id when not importing an existing doc');
    }
    return this._repo.create2<T>(initialValue);
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

  /**
   * @deprecated No-op under Subduction. Heads are derived from loaded {@link DocHandle}s on demand.
   */
  async reIndexHeads(documentIds: DocumentId[]): Promise<void> {
    return;
  }

  /**
   * Under Subduction there is no longer a global share / access-control layer in the Repo —
   * Subduction handles discovery and authorization itself (via adapter role + policy).
   */
  private readonly _shareConfig = {
    access: async (_peerId: PeerId, _documentId?: DocumentId): Promise<boolean> => true,
    announce: async (_peerId: PeerId, _documentId?: DocumentId): Promise<boolean> => true,
  };

  @trace.info({ depth: null })
  private _automergePeers(): PeerId[] {
    return this._repo.peers;
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
  }

  /**
   * Returns current heads of each requested document.
   *
   * Loaded handles are read directly; unloaded documents are reconstructed from their raw
   * automerge chunks in the storage sublevel (avoids triggering a network fetch).
   */
  async getHeads(documentIds: DocumentId[]): Promise<(Heads | undefined)[]> {
    return Promise.all(
      documentIds.map(async (documentId) => {
        const handle = this._repo.handles[documentId];
        if (handle && handle.isReady() && handle.doc()) {
          return getHeads(handle.doc()!);
        }
        const doc = await this._loadDocFromStorage(documentId);
        return doc ? getHeads(doc) : undefined;
      }),
    );
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
          // Incremental without a snapshot — try a best-effort load.
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
   * Enumerate all persisted documents together with their current heads.
   *
   * Discovery strategy:
   *  1. Prefer in-memory state: any currently-loaded {@link DocHandle} yields heads directly.
   *  2. For documents that exist on disk but haven't been loaded, read their chunks out of
   *     the automerge storage sublevel and reconstruct the doc with {@link load} — this
   *     avoids triggering a network round-trip through `Repo.find`, which is unsafe to call
   *     inside a synchronous index-pipeline iteration under Subduction.
   */
  async *listDocumentHeads(): AsyncGenerator<{ documentId: DocumentId; heads: Heads }> {
    const yielded = new Set<DocumentId>();

    for (const [documentId, handle] of Object.entries(this._repo.handles) as Array<
      [DocumentId, DocHandle<any>]
    >) {
      if (!handle.isReady()) {
        continue;
      }
      const doc = handle.doc();
      if (!doc) {
        continue;
      }
      yielded.add(documentId);
      yield { documentId, heads: getHeads(doc) };
    }

    const persistedIds = new Set<DocumentId>();
    for (const chunk of await this._storage.loadRange([])) {
      const documentId = chunk.key[0] as DocumentId | undefined;
      // Filter keys that are not document storage (e.g. `['storage-adapter-id']`,
      // `['subduction', ...]`, etc.) — documents keys always have a second element.
      if (
        documentId &&
        chunk.key.length >= 2 &&
        (chunk.key[1] === 'snapshot' || chunk.key[1] === 'incremental') &&
        !yielded.has(documentId)
      ) {
        persistedIds.add(documentId);
      }
    }

    for (const documentId of persistedIds) {
      const doc = await this._loadDocFromStorage(documentId);
      if (doc) {
        yield { documentId, heads: getHeads(doc) };
      }
    }
  }

  //
  // Legacy collection-sync API — retained as no-ops so downstream callers still compile.
  // Subduction replicates documents via its own discovery + sedimentree protocol.
  // TODO(mykola): Remove these shims once `echo-db` / client-layer migrate off them.
  //

  getLocalCollectionState(_collectionId: string): CollectionState | undefined {
    return undefined;
  }

  getRemoteCollectionStates(_collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return new Map();
  }

  refreshCollection(_collectionId: string): void {
    // No-op.
  }

  async getCollectionSyncState(_collectionId: string): Promise<SpaceSyncState> {
    return { peers: [] };
  }

  async updateLocalCollectionState(_collectionId: string, _documentIds: DocumentId[]): Promise<void> {
    // No-op.
  }

  async clearLocalCollectionState(_collectionId: string): Promise<void> {
    // No-op.
  }
}

const waitForHeads = async (handle: DocHandle<DatabaseDirectory>, heads: Heads) => {
  const unavailableHeads = new Set(heads);

  await handle.whenReady();
  await Event.wrap<DocHandleChangePayload<DatabaseDirectory>>(handle, 'change').waitForCondition(() => {
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
