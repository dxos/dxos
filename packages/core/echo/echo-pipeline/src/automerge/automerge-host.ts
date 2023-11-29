//
// Copyright 2023 DXOS.org
//

import {
  Repo,
  NetworkAdapter,
  StorageAdapter,
  type Message,
  type PeerId,
  type Chunk,
  type StorageKey,
  cbor,
} from '@dxos/automerge/automerge-repo';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { type SyncRepoRequest, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';

export class AutomergeHost {
  private readonly _repo: Repo;
  private readonly _meshNetwork: MeshNetworkAdapter;
  private readonly _clientNetwork: LocalHostNetworkAdapter;
  private readonly _storage: AutomergeStorageAdapter;

  constructor() {
    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new LocalHostNetworkAdapter();
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

  get repo(): Repo {
    return this._repo;
  }

  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    return this._clientNetwork.syncRepo(request);
  }

  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    return this._clientNetwork.sendSyncMessage(request);
  }
}

type ClientSyncState = {
  connected: boolean;
  send: (message: Message) => void;
  disconnect: () => void;
};

/**
 * Used to replicate with apps running on the same device.
 */
class LocalHostNetworkAdapter extends NetworkAdapter {
  private readonly _peers: Map<PeerId, ClientSyncState> = new Map();

  constructor() {
    super();

    this.emit('ready', {
      network: this,
    });
  }

  override connect(peerId: PeerId): void {
    // No-op. Client always connects first
  }

  override send(message: Message): void {
    const peer = this._peers.get(message.targetId);
    invariant(peer, 'Peer not found.');
    peer.send(message);
  }

  override disconnect(): void {
    throw new Error('Method not implemented.');
  }

  syncRepo({ id, syncMessage }: SyncRepoRequest): Stream<SyncRepoResponse> {
    const peerId = this._getPeerId(id);

    return new Stream(({ next, close }) => {
      invariant(!this._peers.has(peerId), 'Peer already connected.');
      this._peers.set(peerId, {
        connected: true,
        send: (message) => {
          next({
            syncMessage: cbor.encode(message),
          });
        },
        disconnect: () => {
          this._peers.delete(peerId);
          close();
          this.emit('peer-disconnected', {
            peerId,
          });
        },
      });

      this.emit('peer-candidate', {
        peerId,
      });
    });
  }

  async sendSyncMessage({ id, syncMessage }: SyncRepoRequest): Promise<void> {
    const message = cbor.decode(syncMessage!) as Message;
    this.emit('message', message);
  }

  private _getPeerId(id: string): PeerId {
    return id as PeerId;
  }
}

/**
 * Used to replicate with other peers over the network.
 */
class MeshNetworkAdapter extends NetworkAdapter {
  override connect(peerId: PeerId): void {
    throw new Error('Method not implemented.');
  }

  override send(message: Message): void {
    throw new Error('Method not implemented.');
  }

  override disconnect(): void {
    throw new Error('Method not implemented.');
  }
}

class AutomergeStorageAdapter extends StorageAdapter {
  override load(key: StorageKey): Promise<Uint8Array | undefined> {
    throw new Error('Method not implemented.');
  }

  override save(key: StorageKey, data: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.');
  }

  override remove(key: StorageKey): Promise<void> {
    throw new Error('Method not implemented.');
  }

  override loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    throw new Error('Method not implemented.');
  }

  override removeRange(keyPrefix: StorageKey): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
