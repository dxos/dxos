//
// Copyright 2023 DXOS.org
//

import { next as automerge } from '@dxos/automerge/automerge';
import { Repo, type StorageAdapter, type PeerId, type DocumentId } from '@dxos/automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { type Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type HostInfo, type SyncRepoRequest, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';
import { StorageType, type Directory } from '@dxos/random-access-storage';
import { type AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';
import { trace } from '@dxos/tracing';
import { ComplexMap, ComplexSet, defaultMap, mapValues } from '@dxos/util';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { LocalHostNetworkAdapter } from './local-host-network-adapter';
import { MeshNetworkAdapter } from './mesh-network-adapter';

export type { DocumentId };

@trace.resource()
export class AutomergeHost {
  private readonly _repo: Repo;
  private readonly _meshNetwork: MeshNetworkAdapter;
  private readonly _clientNetwork: LocalHostNetworkAdapter;
  private readonly _storage: StorageAdapter;

  /**
   * spaceKey -> deviceKey[]
   */
  private readonly _authorizedDevices = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  public _requestedDocs = new Set<string>();

  constructor(storageDirectory: Directory) {
    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new LocalHostNetworkAdapter();

    // TODO(mykola): Delete specific handling of IDB storage.
    this._storage =
      storageDirectory.type === StorageType.IDB
        ? new IndexedDBStorageAdapter(storageDirectory.path, 'data')
        : new AutomergeStorageAdapter(storageDirectory);
    const localPeerId = `host-${PublicKey.random().toHex()}` as PeerId;
    this._repo = new Repo({
      peerId: localPeerId,
      network: [this._clientNetwork, this._meshNetwork],
      storage: this._storage,

      // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
      // Hosts, running in the worker, don't share documents unless requested by other peers.
      sharePolicy: async (peerId /* device key */, documentId /* space key */) => {
        if (peerId.startsWith('client-')) {
          return true;
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
          // experimental_spaceKey is set on old documents, new ones are created with doc.access.spaceKey
          const rawSpaceKey = doc.access?.spaceKey ?? doc.experimental_spaceKey;
          if (!rawSpaceKey) {
            log('space key not found for share policy check', { peerId, documentId });
            return false;
          }

          const spaceKey = PublicKey.from(rawSpaceKey);
          const authorizedDevices = this._authorizedDevices.get(spaceKey);

          // TODO(mykola): Hack, stop abusing `peerMetadata` field.
          const deviceKeyHex = (this.repo.peerMetadataByPeerId[peerId] as any)?.dxos_deviceKey;
          if (!deviceKeyHex) {
            log('device key not found for share policy check', { peerId, documentId });
            return false;
          }
          const deviceKey = PublicKey.from(deviceKeyHex);

          const isAuthorized = authorizedDevices?.has(deviceKey) ?? false;
          log('share policy check', {
            localPeer: localPeerId,
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
  }

  get repo(): Repo {
    return this._repo;
  }

  @trace.info({ depth: null })
  private _automergeDocs() {
    return mapValues(this._repo.handles, (handle) => ({
      state: handle.state,
      hasDoc: !!handle.docSync(),
      heads: handle.docSync() ? automerge.getHeads(handle.docSync()) : null,
    }));
  }

  @trace.info({ depth: null })
  private _automergePeers() {
    return this._repo.peers;
  }

  async close() {
    this._storage instanceof AutomergeStorageAdapter && (await this._storage.close());
    await this._clientNetwork.close();
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
