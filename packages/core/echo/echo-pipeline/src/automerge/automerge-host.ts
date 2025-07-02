//
// Copyright 2023 DXOS.org
//

import {
  getBackend,
  getHeads,
  isAutomerge,
  equals as headsEquals,
  save,
  type Doc,
  type Heads,
} from '@automerge/automerge';
import {
  type DocHandleChangePayload,
  Repo,
  type AnyDocumentId,
  type DocHandle,
  type DocumentId,
  type PeerCandidatePayload,
  type PeerDisconnectedPayload,
  type PeerId,
  type StorageAdapterInterface,
  type StorageKey,
  interpretAsDocumentId,
  type HandleState,
} from '@automerge/automerge-repo';

import { Event, asyncTimeout } from '@dxos/async';
import { Context, Resource, cancelWithContext, type Lifecycle } from '@dxos/context';
import { DatabaseDirectory, type CollectionId } from '@dxos/echo-protocol';
import { type IndexMetadataStore } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { objectPointerCodec } from '@dxos/protocols';
import { type DocHeadsList, type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { bufferToArray } from '@dxos/util';

import { CollectionSynchronizer, diffCollectionState, type CollectionState } from './collection-synchronizer';
import { type EchoDataMonitor } from './echo-data-monitor';
import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter';
import { type EchoReplicator, type RemoteDocumentExistenceCheckParams } from './echo-replicator';
import { HeadsStore } from './heads-store';
import { LevelDBStorageAdapter, type BeforeSaveParams } from './leveldb-storage-adapter';

export type PeerIdProvider = () => string | undefined;

export type RootDocumentSpaceKeyProvider = (documentId: string) => PublicKey | undefined;

export type AutomergeHostParams = {
  db: LevelDB;

  indexMetadataStore: IndexMetadataStore;
  dataMonitor?: EchoDataMonitor;

  /**
   * Used for creating stable ids. A random key is generated on open, if no value is provided.
   */
  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;
};

export type LoadDocOptions = {
  timeout?: number;
};

export type CreateDocOptions = {
  /**
   * Import the document together with its history.
   */
  preserveHistory?: boolean;
};

export const FIND_PARAMS = {
  allowableStates: ['ready', 'requesting'] satisfies HandleState[],
};

/**
 * Abstracts over the AutomergeRepo.
 */
@trace.resource()
export class AutomergeHost extends Resource {
  private readonly _db: LevelDB;
  private readonly _indexMetadataStore: IndexMetadataStore;
  private readonly _echoNetworkAdapter: EchoNetworkAdapter;

  private readonly _collectionSynchronizer = new CollectionSynchronizer({
    queryCollectionState: this._queryCollectionState.bind(this),
    sendCollectionState: this._sendCollectionState.bind(this),
    shouldSyncCollection: this._shouldSyncCollection.bind(this),
  });

  private _repo!: Repo;
  private _storage!: StorageAdapterInterface & Lifecycle;
  private readonly _headsStore: HeadsStore;

  @trace.info()
  private _peerId!: PeerId;

  private readonly _peerIdProvider?: PeerIdProvider;
  private readonly _getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  public readonly collectionStateUpdated = new Event<{ collectionId: CollectionId }>();

  /**
   * Fired after a batch of documents was saved to disk.
   */
  public readonly documentsSaved = new Event();

  constructor({
    db,
    indexMetadataStore,
    dataMonitor,
    peerIdProvider,
    getSpaceKeyByRootDocumentId,
  }: AutomergeHostParams) {
    super();
    this._db = db;
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
    this._headsStore = new HeadsStore({ db: db.sublevel('heads') });
    this._indexMetadataStore = indexMetadataStore;
    this._peerIdProvider = peerIdProvider;
    this._getSpaceKeyByRootDocumentId = getSpaceKeyByRootDocumentId;
  }

  protected override async _open(): Promise<void> {
    this._peerId = `host-${this._peerIdProvider?.() ?? PublicKey.random().toHex()}` as PeerId;

    await this._storage.open?.();

    // Construct the automerge repo.
    this._repo = new Repo({
      peerId: this._peerId as PeerId,
      sharePolicy: this._sharePolicy.bind(this),
      storage: this._storage,
      network: [
        // Upstream swarm.
        this._echoNetworkAdapter,
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

    this._collectionSynchronizer.remoteStateUpdated.on(this._ctx, ({ collectionId, peerId, newDocsAppeared }) => {
      this._onRemoteCollectionStateUpdated(collectionId, peerId);
      this.collectionStateUpdated.emit({ collectionId: collectionId as CollectionId });
      // We use collection lookups during share policy check, so we might need to update share policy for the new doc
      if (newDocsAppeared) {
        updatingAuthScope = true;
        try {
          this._echoNetworkAdapter.onConnectionAuthScopeChanged(peerId);
        } finally {
          updatingAuthScope = false;
        }
      }
    });

    await this._echoNetworkAdapter.open();
    await this._collectionSynchronizer.open();
    await this._echoNetworkAdapter.open();
    await this._echoNetworkAdapter.whenConnected();
  }

  protected override async _close(): Promise<void> {
    await this._collectionSynchronizer.close();
    await this._storage.close?.();
    await this._echoNetworkAdapter.close();
    await this._ctx.dispose();
  }

  /**
   * @deprecated To be abstracted away.
   */
  get repo(): Repo {
    return this._repo;
  }

  get peerId(): PeerId {
    return this._peerId;
  }

  get loadedDocsCount(): number {
    return Object.keys(this._repo.handles).length;
  }

  async addReplicator(replicator: EchoReplicator): Promise<void> {
    await this._echoNetworkAdapter.addReplicator(replicator);
  }

  async removeReplicator(replicator: EchoReplicator): Promise<void> {
    await this._echoNetworkAdapter.removeReplicator(replicator);
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    let handle: DocHandle<T> | undefined;
    if (typeof documentId === 'string') {
      // NOTE: documentId might also be a URL, in which case this lookup will fail.
      handle = this._repo.handles[documentId as DocumentId];
    }
    if (!handle) {
      handle = await this._repo.find(documentId as DocumentId, FIND_PARAMS);
    }

    // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
    if (!handle.isReady()) {
      if (!opts?.timeout) {
        await cancelWithContext(ctx, handle.whenReady());
      } else {
        await cancelWithContext(ctx, asyncTimeout(handle.whenReady(), opts.timeout));
      }
    }

    return handle;
  }

  async exportDoc(ctx: Context, id: AnyDocumentId): Promise<Uint8Array> {
    const documentId = interpretAsDocumentId(id);

    const chunks = await this._storage.loadRange([documentId]);
    return bufferToArray(Buffer.concat(chunks.map((c) => c.data!)));
  }

  /**
   * Create new persisted document.
   */
  createDoc<T>(initialValue?: T | Doc<T> | Uint8Array, opts?: CreateDocOptions): DocHandle<T> {
    if (opts?.preserveHistory) {
      if (initialValue instanceof Uint8Array) {
        return this._repo.import(initialValue);
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      return this._repo.import(save(initialValue as Doc<T>));
    } else {
      if (initialValue instanceof Uint8Array) {
        throw new Error('Cannot create document from Uint8Array without preserving history');
      }

      return this._repo.create(initialValue);
    }
  }

  async waitUntilHeadsReplicated(heads: DocHeadsList): Promise<void> {
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
      return !(currentHeads !== null && headsEquals(currentHeads, targetHeads));
    });
    if (headsToWait.length > 0) {
      await Promise.all(
        headsToWait.map(async (entry, index) => {
          const handle = await this.loadDoc<DatabaseDirectory>(Context.default(), entry.documentId as DocumentId);
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
    for (const documentId of documentIds) {
      log('re-indexing heads for document', { documentId });
      const handle = await this._repo.find(documentId, FIND_PARAMS);
      if (!handle.isReady()) {
        log.warn('document is not available locally, skipping', { documentId });
        continue; // Handle not available locally.
      }

      const heads = handle.heads();
      const batch = this._db.batch();
      this._headsStore.setHeads(documentId, heads, batch);
      await batch.write();
    }
    log('done re-indexing heads');
  }

  // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
  // Hosts, running in the worker, don't share documents unless requested by other peers.
  // NOTE: If both peers return sharePolicy=false the replication will not happen
  // https://github.com/automerge/automerge-repo/pull/292
  private async _sharePolicy(peerId: PeerId, documentId?: DocumentId): Promise<boolean> {
    if (peerId.startsWith('client-')) {
      return false; // Only send docs to clients if they are requested.
    }

    if (!documentId) {
      return false;
    }

    const peerMetadata = this.repo.peerMetadataByPeerId[peerId];
    if (isEchoPeerMetadata(peerMetadata)) {
      return this._echoNetworkAdapter.shouldAdvertise(peerId, { documentId });
    }

    return false;
  }

  private async _beforeSave({ path, batch }: BeforeSaveParams): Promise<void> {
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

    const spaceKey = DatabaseDirectory.getSpaceKey(doc) ?? undefined;
    const objectIds = Object.keys(doc.objects ?? {});
    const encodedIds = objectIds.map((objectId) =>
      objectPointerCodec.encode({ documentId: handle.documentId, objectId, spaceKey }),
    );
    const idToLastHash = new Map(encodedIds.map((id) => [id, heads]));
    this._indexMetadataStore.markDirty(idToLastHash, batch);
  }

  private _shouldSyncCollection(collectionId: string, peerId: PeerId): boolean {
    const peerMetadata = this._repo.peerMetadataByPeerId[peerId];
    if (isEchoPeerMetadata(peerMetadata)) {
      return this._echoNetworkAdapter.shouldSyncCollection(peerId, { collectionId });
    }

    return false;
  }

  /**
   * Called by AutomergeStorageAdapter after levelDB batch commit.
   */
  private async _afterSave(path: StorageKey): Promise<void> {
    this._indexMetadataStore.notifyMarkedDirty();

    const documentId = path[0] as DocumentId;
    const document = this._repo.handles[documentId]?.doc();
    if (document) {
      const heads = getHeads(document);
      this._onHeadsChanged(documentId, heads);
    }
    this.documentsSaved.emit();
  }

  @trace.info({ depth: null })
  private _automergePeers(): PeerId[] {
    return this._repo.peers;
  }

  private async _isDocumentInRemoteCollection(params: RemoteDocumentExistenceCheckParams): Promise<boolean> {
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
    if (handle.state === 'loading') {
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
     * We don't have a document to check access block locally, so we need to rely on external sources (space metada).
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
  async flush({ documentIds }: FlushRequest = {}): Promise<void> {
    // Note: Sync protocol for client and services ensures that all handles should have all changes.

    const loadedDocuments = documentIds?.filter((documentId): documentId is DocumentId => {
      const handle = this._repo.handles[documentId as DocumentId];
      return handle && handle.isReady();
    });
    await this._repo.flush(loadedDocuments);
  }

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
        result[storeResultIndices[i]] = storedHeads[i];
      }
    }
    return result;
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

  async getCollectionSyncState(collectionId: string): Promise<CollectionSyncState> {
    const result: CollectionSyncState = {
      peers: [],
    };

    const localState = this.getLocalCollectionState(collectionId);
    const remoteState = this.getRemoteCollectionStates(collectionId);

    if (!localState) {
      return result;
    }

    for (const [peerId, state] of remoteState) {
      const diff = diffCollectionState(localState, state);
      result.peers.push({
        peerId,
        missingOnRemote: diff.missingOnRemote.length,
        missingOnLocal: diff.missingOnLocal.length,
        differentDocuments: diff.different.length,
        localDocumentCount: Object.keys(localState.documents).length,
        remoteDocumentCount: Object.keys(state.documents).length,
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
    const localState = this._collectionSynchronizer.getLocalCollectionState(collectionId);
    const remoteState = this._collectionSynchronizer.getRemoteCollectionStates(collectionId).get(peerId);

    if (!localState || !remoteState) {
      return;
    }

    const { different, missingOnLocal, missingOnRemote } = diffCollectionState(localState, remoteState);
    const toReplicate = [...missingOnLocal, ...missingOnRemote, ...different];

    if (toReplicate.length === 0) {
      return;
    }

    log('replicating documents after collection sync', {
      collectionId,
      peerId,
      toReplicate,
      count: toReplicate.length,
    });

    // Load the documents so they will start syncing.
    for (const documentId of toReplicate) {
      this._repo.findWithProgress(documentId);
    }
  }

  private _onHeadsChanged(documentId: DocumentId, heads: Heads): void {
    const collectionsChanged = new Set<CollectionId>();
    for (const collectionId of this._collectionSynchronizer.getRegisteredCollectionIds()) {
      const state = this._collectionSynchronizer.getLocalCollectionState(collectionId);
      if (state?.documents[documentId]) {
        const newState = structuredClone(state);
        newState.documents[documentId] = heads;
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

export type CollectionSyncState = {
  peers: PeerSyncState[];
};

export type PeerSyncState = {
  peerId: PeerId;
  /**
   * Documents that are present locally but not on the remote peer.
   */
  missingOnRemote: number;

  /**
   * Documents that are present on the remote peer but not locally.
   */
  missingOnLocal: number;

  /**
   * Documents that are present on both peers but have different heads.
   */
  differentDocuments: number;

  /**
   * Total number of documents locally.
   */
  localDocumentCount: number;

  /**
   * Total number of documents on the remote peer.
   */
  remoteDocumentCount: number;
};
