//
// Copyright 2023 DXOS.org
//

import { next as automerge, getHeads } from '@dxos/automerge/automerge';
import {
  Repo,
  type PeerId,
  type DocumentId,
  type StorageKey,
  type DocHandleChangePayload,
  type StorageAdapterInterface,
} from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { Context, type Lifecycle } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import {
  type FlushRequest,
  type HostInfo,
  type SyncRepoRequest,
  type SyncRepoResponse,
} from '@dxos/protocols/proto/dxos/echo/service';
import { type Directory } from '@dxos/random-access-storage';
import { type AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';
import { trace } from '@dxos/tracing';
import { ComplexMap, ComplexSet, defaultMap, mapValues } from '@dxos/util';

import { type BeforeSaveParams, LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { LocalHostNetworkAdapter } from './local-host-network-adapter';
import { MeshNetworkAdapter } from './mesh-network-adapter';
import { levelMigration } from './migrations';
import { type SpaceDoc, type MyLevelBatch, type MySublevel } from './types';

export type { DocumentId };

export interface MetadataMethods {
  markDirty(idToLastHash: Map<string, string>, batch: MyLevelBatch): Promise<void>;
  afterMarkDirty(): Promise<void>;
}

export type AutomergeHostParams = {
  db: MySublevel;
  /**
   * For migration purposes.
   */
  directory?: Directory;
  metadata?: MetadataMethods;
};

@trace.resource()
export class AutomergeHost {
  private readonly _ctx = new Context();
  private readonly _directory?: Directory;
  private readonly _db: MySublevel;
  private readonly _metadata?: MetadataMethods;

  private _repo!: Repo;
  private _meshNetwork!: MeshNetworkAdapter;
  private _clientNetwork!: LocalHostNetworkAdapter;
  private _storage!: StorageAdapterInterface & Lifecycle;

  @trace.info()
  private _peerId!: string;

  /**
   * spaceKey -> deviceKey[]
   */
  private readonly _authorizedDevices = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  private readonly _updatingMetadata = new Map<string, Promise<void>>();

  public _requestedDocs = new Set<string>();

  constructor({ directory, db, metadata }: AutomergeHostParams) {
    this._directory = directory;
    this._db = db;
    this._metadata = metadata;
  }

  async open() {
    // TODO(mykola): remove this before 0.6 release.
    this._directory && (await levelMigration({ db: this._db, directory: this._directory }));
    this._storage = new LevelDBStorageAdapter({
      db: this._db,
      callbacks: {
        beforeSave: (params) => this._beforeSave(params),
        afterSave: () => this._afterSave(),
      },
    });
    await this._storage.open?.();
    this._peerId = `host-${PublicKey.random().toHex()}` as PeerId;

    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new LocalHostNetworkAdapter();
    this._repo = new Repo({
      peerId: this._peerId as PeerId,
      network: [this._clientNetwork, this._meshNetwork],
      storage: this._storage,

      // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
      // Hosts, running in the worker, don't share documents unless requested by other peers.
      sharePolicy: async (peerId /* device key */, documentId /* space key */) => {
        if (peerId.startsWith('client-')) {
          return false; // Only send docs to clients if they are requested.
        }

        if (!documentId) {
          return false;
        }

        const doc = this._repo.handles[documentId]?.docSync();
        if (!doc) {
          const isRequested = this._requestedDocs.has(`automerge:${documentId}`);
          log('doc share policy check', { peerId, documentId, isRequested });
          return isRequested;
        }

        try {
          const spaceKey = getSpaceKeyFromDoc(doc);
          if (!spaceKey) {
            log('space key not found for share policy check', { peerId, documentId });
            return false;
          }

          const authorizedDevices = this._authorizedDevices.get(PublicKey.from(spaceKey));

          // TODO(mykola): Hack, stop abusing `peerMetadata` field.
          const deviceKeyHex = (this.repo.peerMetadataByPeerId[peerId] as any)?.dxos_deviceKey;
          if (!deviceKeyHex) {
            log('device key not found for share policy check', { peerId, documentId });
            return false;
          }
          const deviceKey = PublicKey.from(deviceKeyHex);

          const isAuthorized = authorizedDevices?.has(deviceKey) ?? false;
          log('share policy check', {
            localPeer: this._peerId,
            remotePeer: peerId,
            documentId,
            deviceKey,
            spaceKey,
            isAuthorized,
          });
          return isAuthorized;
        } catch (err) {
          log.catch(err);
          return false;
        }
      },
    });
    this._clientNetwork.ready();
    this._meshNetwork.ready();

    await this._clientNetwork.whenConnected();
  }

  async close() {
    await this._storage.close?.();
    await this._clientNetwork.close();
    await this._ctx.dispose();
  }

  get repo(): Repo {
    return this._repo;
  }

  private async _beforeSave({ path, batch }: BeforeSaveParams) {
    const getDocumentIdFromPath = (path: StorageKey): DocumentId => path[0] as DocumentId;
    const handle = this._repo.handles[getDocumentIdFromPath(path)];
    if (!handle) {
      return;
    }
    const doc = handle.docSync();
    if (!doc) {
      return;
    }

    const heads = getHeads(doc);
    const lastAvailableHash = heads.join('');

    const getDocumentObjects = (doc: SpaceDoc): string[] => Object.keys(doc.objects ?? {});

    const objectIds = getDocumentObjects(doc);
    const encodedIds = objectIds.map((objectId) => idCodec.encode({ documentId: handle.documentId, objectId }));
    const idToLastHash = new Map(encodedIds.map((id) => [id, lastAvailableHash]));
    await this._metadata?.markDirty(idToLastHash, batch);
  }

  private async _afterSave() {
    await this._metadata?.afterMarkDirty();
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

  //
  // Methods for client-services.
  //

  async flush({ documentIds }: FlushRequest): Promise<void> {
    // Note: Wait for all requested documents to be loaded/synced from thin-client.
    await Promise.all(documentIds?.map((id) => this._repo.find(id as DocumentId).whenReady()) ?? []);
    await this._repo.flush(documentIds as DocumentId[]);
  }

  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    return this._clientNetwork.syncRepo(request);
  }

  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    return this._clientNetwork.sendSyncMessage(request);
  }

  async getHostInfo(): Promise<HostInfo> {
    return this._clientNetwork.getHostInfo();
  }

  //
  // Mesh replication.
  //

  createExtension(): AutomergeReplicator {
    return this._meshNetwork.createExtension();
  }

  authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey) {
    log('authorizeDevice', { spaceKey, deviceKey });
    defaultMap(this._authorizedDevices, spaceKey, () => new ComplexSet(PublicKey.hash)).add(deviceKey);
  }
}

// TODO(mykola): Reconcile with `getInlineAndLinkChanges` in AutomergeDB.
const getInlineChanges = (event: DocHandleChangePayload<any>) => {
  const inlineChangedObjectIds = new Set<string>();
  for (const { path } of event.patches) {
    if (path.length < 2) {
      continue;
    }
    switch (path[0]) {
      case 'objects':
        if (path.length >= 2) {
          inlineChangedObjectIds.add(path[1]);
        }
        break;
    }
  }
  return [...inlineChangedObjectIds];
};

export const getSpaceKeyFromDoc = (doc: any): string | null => {
  // experimental_spaceKey is set on old documents, new ones are created with doc.access.spaceKey
  const rawSpaceKey = doc.access?.spaceKey ?? doc.experimental_spaceKey;
  if (rawSpaceKey == null) {
    return null;
  }

  return String(rawSpaceKey);
};
