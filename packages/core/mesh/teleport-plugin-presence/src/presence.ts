//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { Teleport } from '@dxos/teleport';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { PresenceExtension } from './presence-extension';

export type PresenceParams = {
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
  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash);
  private readonly _peerStates = new ComplexMap<PublicKey, PeerState>(PublicKey.hash);
  private readonly _presenceExtensions = new ComplexMap<
    {
      localPeerId: PublicKey;
      remotePeerId: PublicKey;
    },
    PresenceExtension
  >(({ localPeerId, remotePeerId }) => localPeerId.toHex() + remotePeerId.toHex());

  constructor(private readonly _params: PresenceParams) {}

  createExtension({ teleport }: { teleport: Teleport }): PresenceExtension {
    const extension = new PresenceExtension({
      connections: [...this._getConnections()],
      announceInterval: this._params.announceInterval,
      onAnnounce: async (peerState) => {
        if (this._receivedMessages.has(peerState.messageId)) {
          return;
        }
        this._receivedMessages.add(peerState.messageId);
        this._saveNewState(peerState);
        this._propagateAnnounce(peerState);
      }
    });
    {
      // Connection management.
      this._presenceExtensions.set(
        { localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId },
        extension
      );
      this._reconcileConnections();
      extension.closed.wait().then(
        () => {
          if (
            this._presenceExtensions.has({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId })
          ) {
            this._presenceExtensions.delete({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId });
          }
        },
        (err) => {
          log.catch(err);
        }
      );
    }
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

  private _getConnections(): PublicKey[] {
    return [...this._presenceExtensions.keys()].map(({ remotePeerId }) => remotePeerId);
  }

  private _saveNewState(peerState: PeerState) {
    const oldPeerState = this._peerStates.get(peerState.peerId);
    if (!oldPeerState || oldPeerState.timestamp.getTime() < peerState.timestamp.getTime()) {
      this.updated.emit();
      this._peerStates.set(peerState.peerId, peerState);
    }
  }

  private _propagateAnnounce(peerState: PeerState) {
    this._presenceExtensions.forEach(async (presenceExtension, { localPeerId, remotePeerId }) => {
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

  private _reconcileConnections() {
    this._presenceExtensions.forEach((presenceExtension) => {
      presenceExtension.setConnections(this._getConnections());
    });
  }
}
