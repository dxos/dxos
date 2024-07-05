//
// Copyright 2023 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import {
  next as automerge,
  getBackend,
  getHeads,
  isAutomerge,
  save,
  type Doc,
  type Heads,
} from '@dxos/automerge/automerge';
import {
  Repo,
  type AnyDocumentId,
  type DocHandle,
  type DocHandleChangePayload,
  type DocumentId,
  type PeerId,
  type StorageAdapterInterface,
} from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { Context, cancelWithContext, type Lifecycle } from '@dxos/context';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { type IndexMetadataStore } from '@dxos/indexing';
import { PublicKey } from '@dxos/keys';
import { type LevelDB, type SublevelDB } from '@dxos/kv-store';
import { objectPointerCodec } from '@dxos/protocols';
import {
  type FlushRequest,
  type HostInfo,
  type SyncRepoRequest,
  type SyncRepoResponse,
} from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { mapValues } from '@dxos/util';

import { EchoNetworkAdapter, isEchoPeerMetadata } from './echo-network-adapter';
import { type EchoReplicator } from './echo-replicator';
import { LevelDBStorageAdapter, type BeforeSaveParams } from './leveldb-storage-adapter';
import { LocalHostNetworkAdapter } from './local-host-network-adapter';
import { HeadsStore } from './heads-store';

// TODO: Remove
export type { DocumentId };

export type AutomergeHostParams = {
  db: LevelDB;

  indexMetadataStore: IndexMetadataStore;
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

/**
 * Abstracts over the AutomergeRepo.
 */
@trace.resource()
export class AutomergeHost {
  private readonly _indexMetadataStore: IndexMetadataStore;
  private readonly _ctx = new Context();
  private readonly _echoNetworkAdapter = new EchoNetworkAdapter({
    getContainingSpaceForDocument: this._getContainingSpaceForDocument.bind(this),
  });

  private _repo!: Repo;
  private _clientNetwork!: LocalHostNetworkAdapter;
  private _storage!: StorageAdapterInterface & Lifecycle;
  private readonly _headsStore: HeadsStore;

  @trace.info()
  private _peerId!: string;

  constructor({ db, indexMetadataStore }: AutomergeHostParams) {
    this._storage = new LevelDBStorageAdapter({
      db: db.sublevel('automerge'),
      callbacks: {
        beforeSave: async (params) => this._beforeSave(params),
        afterSave: async () => this._afterSave(),
      },
    });
    this._headsStore = new HeadsStore({ db: db.sublevel('heads') });
    this._indexMetadataStore = indexMetadataStore;
  }

  async open() {
    // TODO(burdon): Should this be stable?
    this._peerId = `host-${PublicKey.random().toHex()}` as PeerId;

    await this._storage.open?.();
    this._clientNetwork = new LocalHostNetworkAdapter();

    // Construct the automerge repo.
    this._repo = new Repo({
      peerId: this._peerId as PeerId,
      sharePolicy: this._sharePolicy.bind(this),
      storage: this._storage,
      network: [
        // Downstream client.
        this._clientNetwork,
        // Upstream swarm.
        this._echoNetworkAdapter,
      ],
    });

    this._clientNetwork.ready();
    await this._echoNetworkAdapter.open();
    await this._clientNetwork.whenConnected();
    await this._echoNetworkAdapter.whenConnected();
  }

  async close() {
    await this._storage.close?.();
    await this._clientNetwork.close();
    await this._echoNetworkAdapter.close();
    await this._ctx.dispose();
  }

  /**
   * @deprecated To be abstracted away.
   */
  get repo(): Repo {
    return this._repo;
  }

  async addReplicator(replicator: EchoReplicator) {
    await this._echoNetworkAdapter.addReplicator(replicator);
  }

  async removeReplicator(replicator: EchoReplicator) {
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
      handle = this._repo.find(documentId as DocumentId);
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

  /**
   * Create new persisted document.
   */
  createDoc<T>(initialValue?: T | Doc<T>, opts?: CreateDocOptions): DocHandle<T> {
    if (opts?.preserveHistory) {
      if (!isAutomerge(initialValue)) {
        throw new TypeError('Initial value must be an Automerge document');
      }
      // TODO(dmaretskyi): There's a more efficient way.
      return this._repo.import(save(initialValue as Doc<T>));
    } else {
      return this._repo.create(initialValue);
    }
  }

  // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
  // Hosts, running in the worker, don't share documents unless requested by other peers.
  // NOTE: If both peers return sharePolicy=false the replication will not happen
  // https://github.com/automerge/automerge-repo/pull/292
  private async _sharePolicy(
    peerId: PeerId /* device key */,
    documentId?: DocumentId /* space key */,
  ): Promise<boolean> {
    if (peerId.startsWith('client-')) {
      return false; // Only send docs to clients if they are requested.
    }

    if (!documentId) {
      return false;
    }

    const peerMetadata = this.repo.peerMetadataByPeerId[peerId];
    if (isEchoPeerMetadata(peerMetadata)) {
      return this._echoNetworkAdapter.shouldAdvertize(peerId, { documentId });
    }

    return false;
  }

  private async _beforeSave({ path, batch }: BeforeSaveParams) {
    const handle = this._repo.handles[path[0] as DocumentId];
    if (!handle) {
      return;
    }
    const doc = handle.docSync();
    if (!doc) {
      return;
    }

    const spaceKey = getSpaceKeyFromDoc(doc) ?? undefined;

    const heads = getHeads(doc);

    this._headsStore.setHeads(handle.documentId, heads, batch);

    const objectIds = Object.keys(doc.objects ?? {});
    const encodedIds = objectIds.map((objectId) =>
      objectPointerCodec.encode({ documentId: handle.documentId, objectId, spaceKey }),
    );
    const idToLastHash = new Map(encodedIds.map((id) => [id, heads]));
    this._indexMetadataStore.markDirty(idToLastHash, batch);
  }

  /**
   * Called by AutomergeStorageAdapter after levelDB batch commit.
   */
  private async _afterSave() {
    this._indexMetadataStore.notifyMarkedDirty();
  }

  @trace.info({ depth: null })
  private _automergeDocs() {
    return mapValues(this._repo.handles, (handle) => ({
      state: handle.state,
      hasDoc: !!handle.docSync(),
      heads: handle.docSync() ? automerge.getHeads(handle.docSync()) : null,
      data:
        handle.docSync() &&
        mapValues(handle.docSync(), (value, key) => {
          try {
            switch (key) {
              case 'access':
              case 'links':
                return value;
              case 'objects':
                return Object.keys(value as any);
              default:
                return `${value}`;
            }
          } catch (err) {
            return `${err}`;
          }
        }),
    }));
  }

  @trace.info({ depth: null })
  private _automergePeers() {
    return this._repo.peers;
  }

  private async _getContainingSpaceForDocument(documentId: string): Promise<PublicKey | null> {
    const doc = this._repo.handles[documentId as any]?.docSync();
    if (!doc) {
      return null;
    }

    const spaceKeyHex = getSpaceKeyFromDoc(doc);
    if (!spaceKeyHex) {
      return null;
    }

    return PublicKey.from(spaceKeyHex);
  }

  /**
   * Flush documents to disk.
   */
  @trace.span({ showInBrowserTimeline: true })
  async flush({ states }: FlushRequest = {}): Promise<void> {
    // Note: Wait for all requested documents to be loaded/synced from thin-client.
    if (states) {
      await Promise.all(
        states.map(async ({ heads, documentId }) => {
          if (!heads) {
            return;
          }
          const handle = this._repo.handles[documentId as DocumentId] ?? this._repo.find(documentId as DocumentId);
          await waitForHeads(handle, heads);
        }) ?? [],
      );
    }

    await this._repo.flush(states?.map(({ documentId }) => documentId as DocumentId));
  }

  async getHeads(documentId: DocumentId): Promise<Heads | undefined> {
    const handle = this._repo.handles[documentId];
    if (handle) {
      const doc = handle.docSync();
      if (!doc) {
        return undefined;
      }
      return getHeads(doc);
    } else {
      return this._headsStore.getHeads(documentId);
    }
  }

  /**
   * Host <-> Client sync.
   */
  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    return this._clientNetwork.syncRepo(request);
  }

  /**
   * Host <-> Client sync.
   */
  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    return this._clientNetwork.sendSyncMessage(request);
  }

  /**
   * Host <-> Client sync.
   */
  async getHostInfo(): Promise<HostInfo> {
    return this._clientNetwork.getHostInfo();
  }
}

export const getSpaceKeyFromDoc = (doc: Doc<SpaceDoc>): string | null => {
  // experimental_spaceKey is set on old documents, new ones are created with doc.access.spaceKey
  const rawSpaceKey = doc.access?.spaceKey ?? (doc as any).experimental_spaceKey;
  if (rawSpaceKey == null) {
    return null;
  }

  return String(rawSpaceKey);
};

const waitForHeads = async (handle: DocHandle<SpaceDoc>, heads: Heads) => {
  await handle.whenReady();
  const unavailableHeads = new Set(heads);

  await Event.wrap<DocHandleChangePayload<SpaceDoc>>(handle, 'change').waitForCondition(() => {
    // Check if unavailable heads became available.
    for (const changeHash of unavailableHeads.values()) {
      if (changeIsPresentInDoc(handle.docSync(), changeHash)) {
        unavailableHeads.delete(changeHash);
      }
    }

    if (unavailableHeads.size === 0) {
      return true;
    }
    return false;
  });
};

const changeIsPresentInDoc = (doc: Doc<any>, changeHash: string): boolean => {
  return !!getBackend(doc).getChangeByHash(changeHash);
};
