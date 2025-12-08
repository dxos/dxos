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
  type HandleState,
  type PeerCandidatePayload,
  type PeerDisconnectedPayload,
  type PeerId,
  Repo,
  type StorageAdapterInterface,
  type StorageKey,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';

import { DeferredTask, Event, asyncTimeout } from '@dxos/async';
import { Context, type Lifecycle, Resource, cancelWithContext } from '@dxos/context';
import { type CollectionId, DatabaseDirectory } from '@dxos/echo-protocol';
import { type IndexMetadataStore } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { objectPointerCodec } from '@dxos/protocols';
import { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { type DocHeadsList, type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { ComplexSet, bufferToArray, isNonNullable, range } from '@dxos/util';

import { type CollectionState, CollectionSynchronizer, diffCollectionState } from './collection-synchronizer';
import { type EchoDataMonitor } from './echo-data-monitor';
import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter';
import { type EchoReplicator, type RemoteDocumentExistenceCheckParams } from './echo-replicator';
import { HeadsStore } from './heads-store';
import { type BeforeSaveParams, LevelDBStorageAdapter } from './leveldb-storage-adapter';

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
  private _createdDocuemnts = new Set<DocumentId>();

  /**
   * Documents that need to be synced based on the result of collection-sync.
   */
  private _documentsToSync = new Set<DocumentId>();

  private _sharePolicyChangedTask?: DeferredTask;

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

    this._onHeadsChangedTask = new DeferredTask(this._ctx, async () => {
      const docHeads = Array.from(this._headsUpdates.entries());
      this._headsUpdates.clear();
      this._onHeadsChanged(docHeads);
    });

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

    this._syncTask = new DeferredTask(this._ctx, async () => {
      const collectionToSync = Array.from(this._collectionsToSync.values());
      if (collectionToSync.length === 0) {
        return;
      }
      await Promise.all(
        collectionToSync.map(async ({ collectionId, peerId }) => {
          try {
            await this._handleCollectionSync(collectionId, peerId);
          } catch (err) {
            log.error('failed to sync collection', { collectionId, peerId, err });
          }
        }),
      );
    });

    this._sharePolicyChangedTask = new DeferredTask(this._ctx, async () => {
      this._repo.shareConfigChanged();
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
    this._syncTask = undefined;
    this._onHeadsChangedTask = undefined;
    this._sharePolicyChangedTask = undefined;
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
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.addReplicator(replicator);
  }

  async removeReplicator(replicator: EchoReplicator): Promise<void> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    await this._echoNetworkAdapter.removeReplicator(replicator);
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    invariant(this.isOpen, 'AutomergeHost is not open');
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
    invariant(this.isOpen, 'AutomergeHost is not open');
    const documentId = interpretAsDocumentId(id);

    const chunks = await this._storage.loadRange([documentId]);
    return bufferToArray(Buffer.concat(chunks.map((c) => c.data!)));
  }

  /**
   * Create new persisted document.
   */
  createDoc<T>(initialValue?: T | Doc<T> | Uint8Array, opts?: CreateDocOptions): DocHandle<T> {
    invariant(this.isOpen, 'AutomergeHost is not open');
    if (opts?.preserveHistory) {
      if (initialValue instanceof Uint8Array) {
        return this._repo.import(initialValue);
      }

      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }

      // TODO(dmaretskyi): There's a more efficient way.
      const handle = this._repo.import(save(initialValue as Doc<T>));
      this._createdDocuemnts.add(handle.documentId);
      this._sharePolicyChangedTask!.schedule();
      return handle as DocHandle<T>;
    } else {
      if (initialValue instanceof Uint8Array) {
        throw new Error('Cannot create document from Uint8Array without preserving history');
      }

      const handle = this._repo.create(initialValue);
      this._createdDocuemnts.add(handle.documentId);
      this._sharePolicyChangedTask!.schedule();
      return handle as DocHandle<T>;
    }
  }

  async waitUntilHeadsReplicated(heads: DocHeadsList): Promise<void> {
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
      return !(currentHeads !== null && headsEquals(currentHeads, targetHeads));
    });
    if (headsToWait.length > 0) {
      await Promise.all(
        headsToWait.map(async (entry) => {
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
    invariant(this.isOpen, 'AutomergeHost is not open');
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
    if (!documentId) {
      return false;
    }

    if (!this._createdDocuemnts.has(documentId) && !this._documentsToSync.has(documentId)) {
      // Skip advertising documents that don't need to be synced.
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
    if (!this.isOpen) {
      return undefined;
    }

    this._indexMetadataStore.notifyMarkedDirty();
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
    invariant(this._onHeadsChangedTask, 'onHeadsChangedTask is not initialized');
    this._onHeadsChangedTask.schedule();
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

    const loadedDocuments = (documentIds ?? Object.keys(this._repo.handles)).filter(
      (documentId): documentId is DocumentId => {
        const handle = this._repo.handles[documentId as DocumentId];
        return handle && handle.isReady();
      },
    );
    await this._repo.flush(loadedDocuments);

    // Ensure that document verions have propagated accross the system.
    // This is important for the case where we are doing flush and then waiting for sync to happen.
    await this._onHeadsChangedTask?.runBlocking();
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
    // This reduces reliance on the next periodic query and prevents replication stalls in fast paths
    // where the remote queries before our local state is ready.
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

  private async _handleCollectionSync(collectionId: string, peerId: PeerId) {
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
      const { syncInteractively } = await this._pushInBundles(peerId, missingOnRemote);
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
      const { syncInteractively } = await this._pullInBundles(peerId, missingOnLocal);
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

    // Load the documents so they will start syncing.
    for (const documentId of toReplicateWithoutBatching) {
      // Unless we track the document in "to sync" list, it will not be advertised.
      this._documentsToSync!.add(documentId);
      this._repo.findWithProgress(documentId);
    }
    this._sharePolicyChangedTask!.schedule();
  }

  // TODO(mykola): Add retries of batches https://gist.github.com/mykola-vrmchk/fde270259e9209fcbf1331e5abbf12cf
  // TODO(mykola): Use effect to retry batches.
  private async _pushInBundles(
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
          await this._pushBundle(peerId, bundle).catch((err) => {
            log.warn('failed to push bundle, replicating interactively', { peerId, bundle, err });
            syncInteractively.push(...bundle);
          });
        }),
      );
    }

    return { syncInteractively };
  }

  private async _pushBundle(peerId: PeerId, documentIds: DocumentId[]): Promise<void> {
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

    await this._echoNetworkAdapter.pushBundle(peerId, docs.filter(isNonNullable));
  }

  private async _pullInBundles(
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
          const result = await this._pullBundle(peerId, bundle).catch((err) => {
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
    peerId: PeerId,
    documentIds: DocumentId[],
  ): Promise<{ docsToImport: Record<DocumentId, Uint8Array> } | undefined> {
    if (this._ctx.disposed) {
      return;
    }
    // NOTE: We are expecting that documents that are being pulled are not present locally, so we are pulling all changes.
    const docHeads = Object.fromEntries(documentIds.map((documentId) => [documentId, []]));
    const bundle = await this._echoNetworkAdapter.pullBundle(peerId, docHeads);
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
