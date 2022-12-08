//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event, scheduleTaskInterval, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { Teleport } from '@dxos/teleport';
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

  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash);
  private readonly _peerStates = new ComplexMap<PublicKey, PeerState>(PublicKey.hash);
  private readonly _connections = new ComplexMap<
    {
      localPeerId: PublicKey;
      remotePeerId: PublicKey;
    },
    PresenceExtension
  >(({ localPeerId, remotePeerId }) => localPeerId.toHex() + remotePeerId.toHex());

  constructor(private readonly _params: PresenceParams) {
    scheduleTaskInterval(
      this._ctx,
      async () => {
        await this._sendAnnounces();
      },
      _params.announceInterval
    );
  }

  async createExtension({ teleport }: { teleport: Teleport }): Promise<PresenceExtension> {
    assert(
      teleport.localPeerId.equals(this._params.localPeerId),
      'Teleport local peer id does not match presence local peer id.'
    );
    const extension = new PresenceExtension({
      onAnnounce: async (peerState) => {
        if (this._receivedMessages.has(peerState.messageId)) {
          return;
        }
        this._receivedMessages.add(peerState.messageId);
        this._saveNewState(peerState);
        this._propagateAnnounce(peerState);
      },
      onClose: async (err) => {
        if (err) {
          log.catch(err);
        }
        if (this._connections.has({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId })) {
          this._connections.delete({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId });
        }
        scheduleTask(this._ctx, async () => {
          await this._sendAnnounces();
        });
      }
    });
    this._connections.set({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId }, extension);
    scheduleTask(this._ctx, async () => {
      await this._sendAnnounces();
    });
    teleport.addExtension('dxos.mesh.teleport.presence', extension);

    return extension;
  }

  getPeerStates(): PeerState[] {
    return [...this._peerStates.values()];
  }

  getPeerStatesOnline(): PeerState[] {
    return this.getPeerStates().filter(
      (peerState) => peerState.timestamp.getTime() > Date.now() - this._params.offlineTimeout
    );
  }

  async destroy() {
    await this._ctx.dispose();
  }

  private _getConnections(): PublicKey[] {
    return [...this._connections.keys()].map(({ remotePeerId }) => remotePeerId);
  }

  private _saveNewState(peerState: PeerState) {
    const oldPeerState = this._peerStates.get(peerState.peerId);
    if (!oldPeerState || oldPeerState.timestamp.getTime() < peerState.timestamp.getTime()) {
      this.updated.emit();
      this._peerStates.set(peerState.peerId, peerState);
    }
  }

  private _propagateAnnounce(peerState: PeerState) {
    this._connections.forEach(async (presenceExtension, { localPeerId, remotePeerId }) => {
      if (localPeerId.equals(peerState.peerId) || remotePeerId.equals(peerState.peerId)) {
        return;
      }
      try {
        await presenceExtension.sendAnnounce(peerState);
      } catch (err) {
        log.catch(err);
      }
    });
  }

  private _sendAnnounces() {
    return Promise.all(
      [...this._connections.entries()].map(([{ localPeerId }, presenceExtension]) =>
        presenceExtension
          .sendAnnounce({
            peerId: localPeerId,
            connections: this._getConnections(),
            messageId: PublicKey.random(),
            timestamp: new Date()
          })
          .catch((err) => log.catch(err))
      )
    );
  }
}
