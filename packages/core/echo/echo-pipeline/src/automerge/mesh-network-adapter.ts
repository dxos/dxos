//
// Copyright 2024 DXOS.org
//

import { Trigger, yieldIfSaturated } from '@dxos/async';
import { NetworkAdapter, cbor, type Message, type PeerId } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type PeerInfo } from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import { AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';

/**
 * Used to replicate with other peers over the network.
 */
export class MeshNetworkAdapter extends NetworkAdapter {
  private readonly _extensions: Map<string, AutomergeReplicator> = new Map();
  private _connected = new Trigger();

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
    this._connected.wake();
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
          await this._connected.wait();

          // Note: We store only one extension per peer.
          //       There can be a case where two connected peers have more than one teleport connection between them
          //       and each of them uses different teleport connections to send messages.
          //       It works because we receive messages from all teleport connections and Automerge Repo dedup them.
          // TODO(mykola): Use only one teleport connection per peer.

          // TODO(dmaretskyi): Critical bug.
          // - two peers get connected via swarm 1
          // - they get connected via swarm 2
          // - swarm 1 gets disconnected
          // - automerge repo thinks that peer 2 got disconnected even though swarm 2 is still active

          log('onStartReplication', { id: info.id, thisPeerId: this.peerId, remotePeerId: remotePeerId.toHex() });
          if (!this._extensions.has(info.id)) {
            peerInfo = info;
            // TODO(mykola): Fix race condition?
            this._extensions.set(info.id, extension);

            log('peer-candidate', { id: info.id, thisPeerId: this.peerId, remotePeerId: remotePeerId.toHex() });
            this.emit('peer-candidate', {
              // TODO(mykola): Hack, stop abusing `peerMetadata` field.
              peerMetadata: {
                dxos_deviceKey: remotePeerId.toHex(),
              } as any,
              peerId: info.id as PeerId,
            });
          }
        },
        onSyncMessage: async ({ payload }) => {
          if (!peerInfo) {
            return;
          }

          // Throttle replication if the thread is saturated.
          await yieldIfSaturated();

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
