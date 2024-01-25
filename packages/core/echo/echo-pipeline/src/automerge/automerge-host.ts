//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
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
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type HostInfo, type SyncRepoRequest, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';
import { type PeerInfo } from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import { StorageType, type Directory } from '@dxos/random-access-storage';
import { AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';
import { ComplexMap, ComplexSet, arrayToBuffer, bufferToArray, defaultMap } from '@dxos/util';

export class AutomergeHost {
  private readonly _repo: Repo;
  private readonly _meshNetwork: MeshNetworkAdapter;
  private readonly _clientNetwork: LocalHostNetworkAdapter;
  private readonly _storage: StorageAdapter;

  /**
   * spaceKey -> deviceKey[]
   */
  private readonly _authorizedDevices = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  constructor(storageDirectory: Directory) {
    this._meshNetwork = new MeshNetworkAdapter();
    this._clientNetwork = new LocalHostNetworkAdapter();

    // TODO(mykola): Delete specific handling of IDB storage.
    this._storage =
      storageDirectory.type === StorageType.IDB
        ? new IndexedDBStorageAdapter(storageDirectory.path, 'data')
        : new AutomergeStorageAdapter(storageDirectory);
    this._repo = new Repo({
      peerId: `host-${PublicKey.random().toHex()}` as PeerId,
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
          log.warn('doc not found for share policy check', { peerId, documentId });
          return false;
        }

        try {
          const spaceKey = PublicKey.from(doc.experimental_spaceKey);
          const authorizedDevices = this._authorizedDevices.get(spaceKey);

          const deviceKeyHex = (this.repo.peerMetadataByPeerId[peerId] as any)?.dxos_deviceKey;
          if (!deviceKeyHex) {
            log.warn('device key not found for share policy check', { peerId, documentId });
            return false;
          }
          const deviceKey = PublicKey.from(deviceKeyHex);

          const isAuthorized = authorizedDevices?.has(deviceKey) ?? false;
          log.info('share policy check', { peerId, documentId, deviceKey, spaceKey, isAuthorized });
          return isAuthorized;
        } catch (err) {
          log.catch(err);
          return false;
        }
      }, // Share everything.
    });
    this._clientNetwork.ready();
    this._meshNetwork.ready();
  }

  get repo(): Repo {
    return this._repo;
  }

  async close() {
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
    defaultMap(this._authorizedDevices, spaceKey, () => new ComplexSet(PublicKey.hash)).add(deviceKey);
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

  /**
   * Emits `ready` event. That signals to `Repo` that it can start using the adapter.
   */
  ready() {
    // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
    //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
    this.emit('ready', {
      network: this,
    });
  }

  onConnected = new Trigger();

  override connect(peerId: PeerId): void {
    this.peerId = peerId;
    this.onConnected.wake();
    // No-op. Client always connects first
  }

  override send(message: Message): void {
    const peer = this._peers.get(message.targetId);
    invariant(peer, 'Peer not found.');
    peer.send(message);
  }

  async close() {
    this._peers.forEach((peer) => peer.disconnect());
    this.emit('close');
  }

  override disconnect(): void {
    // TODO(mykola): `disconnect` is not used anywhere in `Repo` from `@automerge/automerge-repo`. Should we remove it?
    // No-op
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
        peerMetadata: {},
        peerId,
      });
    });
  }

  async sendSyncMessage({ id, syncMessage }: SyncRepoRequest): Promise<void> {
    const message = cbor.decode(syncMessage!) as Message;
    this.emit('message', message);
  }

  async getHostInfo(): Promise<HostInfo> {
    await this.onConnected.wait({ timeout: 1_000 });
    invariant(this.peerId, 'Peer id not set.');
    return {
      peerId: this.peerId,
    };
  }

  private _getPeerId(id: string): PeerId {
    return id as PeerId;
  }
}

/**
 * Used to replicate with other peers over the network.
 */
export class MeshNetworkAdapter extends NetworkAdapter {
  private readonly _extensions: Map<string, AutomergeReplicator> = new Map();

  /**
   * Emits `ready` event. That signals to `Repo` that it can start using the adapter.
   */
  ready() {
    // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
    //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
    this.emit('ready', {
      network: this,
    });
  }

  override connect(peerId: PeerId): void {
    this.peerId = peerId;
  }

  override send(message: Message): void {
    const receiverId = message.targetId;
    const extension = this._extensions.get(receiverId);
    invariant(extension, 'Extension not found.');
    extension.sendSyncMessage({ payload: cbor.encode(message) }).catch((err) => log.catch(err));
  }

  override disconnect(): void {
    // No-op
  }

  createExtension(): AutomergeReplicator {
    invariant(this.peerId, 'Peer id not set.');

    let peerInfo: PeerInfo;
    const extension = new AutomergeReplicator(
      {
        peerId: this.peerId,
      },
      {
        onStartReplication: async (info, remotePeerId /** Teleport ID */) => {
          // Note: We store only one extension per peer.
          //       There can be a case where two connected peers have more than one teleport connection between them
          //       and each of them uses different teleport connections to send messages.
          //       It works because we receive messages from all teleport connections and Automerge Repo dedup them.
          // TODO(mykola): Use only one teleport connection per peer.
          if (this._extensions.has(info.id)) {
            return;
          }

          peerInfo = info;
          // TODO(mykola): Fix race condition?
          this._extensions.set(info.id, extension);
          this.emit('peer-candidate', {
            peerMetadata: {
              dxos_deviceKey: remotePeerId.toHex(),
            } as any,
            peerId: info.id as PeerId,
          });
        },
        onSyncMessage: async ({ payload }) => {
          const message = cbor.decode(payload) as Message;
          // Note: automerge Repo dedup messages.
          this.emit('message', message);
        },
        onClose: async () => {
          if (!peerInfo) {
            return;
          }
          this.emit('peer-disconnected', {
            peerId: peerInfo.id as PeerId,
          });
          this._extensions.delete(peerInfo.id);
        },
      },
    );
    return extension;
  }
}

export class AutomergeStorageAdapter extends StorageAdapter {
  constructor(private readonly _directory: Directory) {
    super();
  }

  override async load(key: StorageKey): Promise<Uint8Array | undefined> {
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    const { size } = await file.stat();
    if (!size || size === 0) {
      return undefined;
    }
    const buffer = await file.read(0, size);
    return bufferToArray(buffer);
  }

  override async save(key: StorageKey, data: Uint8Array): Promise<void> {
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    await file.write(0, arrayToBuffer(data));
    await file.truncate?.(data.length);

    await file.flush?.();
  }

  override async remove(key: StorageKey): Promise<void> {
    // TODO(dmaretskyi): Better deletion.
    const filename = this._getFilename(key);
    const file = this._directory.getOrCreateFile(filename);
    await file.destroy();
  }

  override async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const filename = this._getFilename(keyPrefix);
    const entries = await this._directory.list();
    return Promise.all(
      entries
        .filter((entry) => entry.startsWith(filename))
        .map(async (entry): Promise<Chunk> => {
          const file = this._directory.getOrCreateFile(entry);
          const { size } = await file.stat();
          const buffer = await file.read(0, size);
          return {
            key: this._getKeyFromFilename(entry),
            data: bufferToArray(buffer),
          };
        }),
    );
  }

  override async removeRange(keyPrefix: StorageKey): Promise<void> {
    const filename = this._getFilename(keyPrefix);
    const entries = await this._directory.list();
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(filename))
        .map(async (entry): Promise<void> => {
          const file = this._directory.getOrCreateFile(entry);
          await file.destroy();
        }),
    );
  }

  private _getFilename(key: StorageKey): string {
    return key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-');
  }

  private _getKeyFromFilename(filename: string): StorageKey {
    return filename.split('-').map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%'));
  }
}
