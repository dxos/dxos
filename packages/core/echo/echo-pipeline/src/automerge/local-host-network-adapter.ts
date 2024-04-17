//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { NetworkAdapter, type Message, type PeerId, cbor } from '@dxos/automerge/automerge-repo';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type HostInfo, type SyncRepoRequest, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';

type ClientSyncState = {
  connected: boolean;
  send: (message: Message) => void;
  disconnect: () => void;
};

/**
 * Used to replicate with apps running on the same device.
 */
export class LocalHostNetworkAdapter extends NetworkAdapter {
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

  private _connected = new Trigger();

  /**
   * Called by `Repo` to connect to the network.
   * 
   * @param peerId Our peer Id.
   */
  override connect(peerId: PeerId): void {
    this.peerId = peerId;
    this._connected.wake();
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

      this._connected
        .wait({ timeout: 1_000 })
        .then(() => {
          this.emit('peer-candidate', {
            peerMetadata: {},
            peerId,
          });
        })
        .catch((err) => log.catch(err));
    });
  }

  async sendSyncMessage({ id, syncMessage }: SyncRepoRequest): Promise<void> {
    await this._connected.wait({ timeout: 1_000 });
    const message = cbor.decode(syncMessage!) as Message;
    this.emit('message', message);
  }

  async getHostInfo(): Promise<HostInfo> {
    await this._connected.wait({ timeout: 1_000 });
    invariant(this.peerId, 'Peer id not set.');
    return {
      peerId: this.peerId,
    };
  }

  private _getPeerId(id: string): PeerId {
    return id as PeerId;
  }
}
