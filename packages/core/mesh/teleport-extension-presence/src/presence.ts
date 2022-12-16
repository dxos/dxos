//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event, scheduleTaskInterval, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { PresenceExtension } from './presence-extension';

export type PresenceParams = {
  localPeerId: PublicKey;

  /**
   * Interval between presence announces.
   */
  announceInterval: number;
  /**
   * Timeout after which a peer is considered offline.
   * Should be greater than announceInterval.
   */
  offlineTimeout: number;
};

/**
 * Presence manager.
 * Keeps track of all peers that are connected to the local peer.
 * Routes received presence announces to all connected peers.
 * Exposes API to get the list of peers that are online.
 */
export class Presence {
  public readonly updated = new Event<void>();
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    }
  });

  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash); // TODO(mykola): Memory leak. Never cleared.
  private readonly _peerStates = new ComplexMap<PublicKey, PeerState>(PublicKey.hash);

  // remotePeerId -> PresenceExtension
  private readonly _connections = new ComplexMap<PublicKey, PresenceExtension>(PublicKey.hash);

  constructor(private readonly _params: PresenceParams) {
    assert(
      this._params.announceInterval < this._params.offlineTimeout,
      'Announce interval should be less than offline timeout.'
    );
    scheduleTaskInterval(
      this._ctx,
      async () => {
        await this._sendAnnounces();
      },
      _params.announceInterval
    );
  }

  createExtension({ remotePeerId }: { remotePeerId: PublicKey }): PresenceExtension {
    const extension = new PresenceExtension({
      onAnnounce: async (peerState) => {
        if (this._receivedMessages.has(peerState.messageId)) {
          return;
        }
        this._receivedMessages.add(peerState.messageId);
        this._saveNewState(peerState);
        scheduleTask(this._ctx, async () => {
          await this._propagateAnnounce(peerState);
        });
      },
      onClose: async (err) => {
        if (err) {
          log.catch(err);
        }
        if (this._connections.has(remotePeerId)) {
          this._connections.delete(remotePeerId);
        }
        scheduleTask(this._ctx, async () => {
          await this._sendAnnounces();
        });
      }
    });
    this._connections.set(remotePeerId, extension);
    scheduleTask(this._ctx, async () => {
      await this._sendAnnounces();
    });

    return extension;
  }

  getPeers(): PeerState[] {
    return [...this._peerStates.values()];
  }

  getPeersOnline(): PeerState[] {
    return this.getPeers().filter(
      (peerState) => peerState.timestamp.getTime() > Date.now() - this._params.offlineTimeout
    );
  }

  async destroy() {
    await this._ctx.dispose();
  }

  private _getConnections(): PublicKey[] {
    return [...this._connections.keys()];
  }

  private _sendAnnounces() {
    return Promise.all(
      [...this._connections.values()].map((presenceExtension) =>
        presenceExtension
          .sendAnnounce({
            peerId: this._params.localPeerId,
            connections: this._getConnections(),
            messageId: PublicKey.random(),
            timestamp: new Date()
          })
          .catch((err) => log.catch(err))
      )
    );
  }

  private _saveNewState(peerState: PeerState) {
    const oldPeerState = this._peerStates.get(peerState.peerId);
    if (!oldPeerState || oldPeerState.timestamp.getTime() < peerState.timestamp.getTime()) {
      this.updated.emit();
      this._peerStates.set(peerState.peerId, peerState);
    }
  }

  private _propagateAnnounce(peerState: PeerState) {
    return Promise.all(
      [...this._connections.entries()].map(async ([remotePeerId, extension]) => {
        if (this._params.localPeerId.equals(peerState.peerId) || remotePeerId.equals(peerState.peerId)) {
          return;
        }
        return extension.sendAnnounce(peerState).catch((err) => log.catch(err));
      })
    );
  }
}
