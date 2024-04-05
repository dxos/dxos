//
// Copyright 2023 DXOS.org
//

import { next as automerge, getHeads } from '@dxos/automerge/automerge';
import {
  Repo,
  type PeerId,
  type DocumentId,
  type StorageKey,
  type DocHandle,
  type DocHandleChangePayload,
} from '@dxos/automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { type HostInfo, type SyncRepoRequest, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';
import { StorageType, type Directory } from '@dxos/random-access-storage';
import { type AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';
import { trace } from '@dxos/tracing';
import { ComplexMap, ComplexSet, defaultMap, mapValues } from '@dxos/util';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { AutomergeStorageWrapper } from './automerge-storage–wrapper';
import { LocalHostNetworkAdapter } from './local-host-network-adapter';
import { MeshNetworkAdapter } from './mesh-network-adapter';

export type { DocumentId };

export interface MetadataMethods {
  markDirty(idToLastHash: Map<string, string>): Promise<void>;
}

export type AutomergeHostParams = {
  directory: Directory;
  metadata?: MetadataMethods;
};

@trace.resource()
export class AutomergeHost {
  private readonly _ctx = new Context();
  private readonly _repo: Repo;
  private readonly _meshNetwork: MeshNetworkAdapter;
  private readonly _clientNetwork: LocalHostNetworkAdapter;
  private readonly _storage: AutomergeStorageWrapper;

  @trace.info()
  private readonly _peerId: string;

  /**
   * spaceKey -> deviceKey[]
   */
  private readonly _authorizedDevices = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  private readonly _updatingMetadata = new Map<string, Promise<void>>();
  private readonly _metadata?: MetadataMethods;

  public _requestedDocs = new Set<string>();

  constructor({ directory, metadata }: AutomergeHostParams) {
    this._metadata = metadata;
    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new LocalHostNetworkAdapter();

    this._storage = new AutomergeStorageWrapper({
      storage:
        // TODO(mykola): Delete specific handling of IDB storage.
        directory.type === StorageType.IDB
          ? new IndexedDBStorageAdapter(directory.path, 'data')
          : new AutomergeStorageAdapter(directory),
      callbacks: { beforeSave: (params) => this._beforeSave(params) },
    });
    this._peerId = `host-${PublicKey.random().toHex()}` as PeerId;
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

    {
      const listener = ({ handle }: { handle: DocHandle<any> }) => this._onDocument(handle);
      this._repo.on('document', listener);
      this._ctx.onDispose(() => {
        this._repo.off('document', listener);
        Object.values(this._repo.handles).forEach((handle) => handle.off('change'));
      });
    }
  }

  get repo(): Repo {
    return this._repo;
  }

  private async _beforeSave(path: StorageKey) {
    const id = path[0];
    if (this._updatingMetadata.has(id)) {
      return this._updatingMetadata.get(id);
    }
  }

  private _onDocument(handle: DocHandle<any>) {
    const listener = (event: DocHandleChangePayload<any>) => this._onUpdate(event);
    handle.on('change', listener);
  }

  private _onUpdate(event: DocHandleChangePayload<any>) {
    if (this._metadata == null) {
      return;
    }

    const objectIds = getInlineChanges(event);
    if (objectIds.length === 0) {
      return;
    }

    const heads = getHeads(event.doc);
    const lastAvailableHash = heads.join('');
    if (!lastAvailableHash) {
      return;
    }

    const encodedIds = objectIds.map((objectId) => idCodec.encode({ documentId: event.handle.documentId, objectId }));
    const idToLastHash = new Map(encodedIds.map((id) => [id, lastAvailableHash]));
    const markingDirtyPromise = this._metadata
      .markDirty(idToLastHash)
      .then(() => {
        this._updatingMetadata.delete(event.handle.documentId);
      })
      .catch((err: Error) => {
        this._ctx.disposed && log.catch(err);
      });
    this._updatingMetadata.set(event.handle.documentId, markingDirtyPromise);
  }

  @trace.info({ depth: null })
  private _automergeDocs() {
    return mapValues(this._repo.handles, (handle) => ({
      state: handle.state,
      hasDoc: !!handle.docSync(),
      heads: handle.docSync() ? automerge.getHeads(handle.docSync()) : null,
      data:
        handle.docSync()?.doc &&
        mapValues(handle.docSync()?.doc, (value, key) => {
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

  async close() {
    await this._storage.close();
    await this._clientNetwork.close();
    await this._ctx.dispose();
  }

  //
  // Methods for client-services.
  //

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
