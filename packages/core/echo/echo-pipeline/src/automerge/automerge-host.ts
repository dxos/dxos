import { Stream } from "@dxos/codec-protobuf";
import { SyncRepoRequest, SyncRepoResponse } from "@dxos/protocols/proto/dxos/echo/service";
import { Repo, NetworkAdapter, StorageAdapter, Message, PeerId, Chunk, StorageKey } from '@dxos/automerge/automerge-repo'

export class AutomergeHost {
  private readonly _repo: Repo;
  private readonly _meshNetwork: MeshNetworkAdapter;
  private readonly _clientNetwork: ClientNetworkAdapter;
  private readonly _storage: AutomergeStorageAdapter;

  constructor() {
    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new ClientNetworkAdapter();
    this._storage = new AutomergeStorageAdapter();
    this._repo = new Repo({
      network: [
        // this._meshNetwork,
        this._clientNetwork,
      ],

      // storage: this._storage,

      // TODO(dmaretskyi): Share based on HALO permissions and space affinity.
      sharePolicy: async (peerId, documentId) => true, // Share everything.
    });
  }

  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    return this._clientNetwork.syncRepo(request);
  }

  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    return this._clientNetwork.sendSyncMessage(request);
  }
}

/**
 * Used to replicate with apps running on the same device.
 */
class ClientNetworkAdapter extends NetworkAdapter {
  override connect(peerId: PeerId): void {
    throw new Error("Method not implemented.");
  }
  override send(message: Message): void {
    throw new Error("Method not implemented.");
  }
  override disconnect(): void {
    throw new Error("Method not implemented.");
  }

  syncRepo({id, syncMessage}: SyncRepoRequest): Stream<SyncRepoResponse> {
    const stream = new Stream(({}) => {

    })
    throw new Error('Method not implemented.');
  }

  sendSyncMessage({id, syncMessage}: SyncRepoRequest): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

/**
 * Used to replicate with other peers over the network.
 */
class MeshNetworkAdapter extends NetworkAdapter {
  override connect(peerId: PeerId): void {
    throw new Error("Method not implemented.");
  }
  override send(message: Message): void {
    throw new Error("Method not implemented.");
  }
  override disconnect(): void {
    throw new Error("Method not implemented.");
  }
}

class AutomergeStorageAdapter extends StorageAdapter {
  override load(key: StorageKey): Promise<Uint8Array | undefined> {
    throw new Error("Method not implemented.");
  }
  override save(key: StorageKey, data: Uint8Array): Promise<void> {
    throw new Error("Method not implemented.");
  }
  override remove(key: StorageKey): Promise<void> {
    throw new Error("Method not implemented.");
  }
  override loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    throw new Error("Method not implemented.");
  }
  override removeRange(keyPrefix: StorageKey): Promise<void> {
    throw new Error("Method not implemented.");
  }

}