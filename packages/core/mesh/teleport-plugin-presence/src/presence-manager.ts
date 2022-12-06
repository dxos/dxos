//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { Teleport } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { PresenceExtension } from './presence-extension';

export type PresenceManagerParams = {
  resendAnnounce: number;
  offlineTimeout: number;
};

export class PresenceManager {
  private readonly _peerStates = new ComplexMap<PublicKey, PeerState>(PublicKey.hash);
  private readonly _presenceExtensions = new ComplexMap<
    {
      localPeerId: PublicKey;
      remotePeerId: PublicKey;
    },
    PresenceExtension
  >(({ localPeerId, remotePeerId }) => localPeerId.toHex() + remotePeerId.toHex());

  constructor(private readonly _params: PresenceManagerParams) {}

  createExtension({ teleport }: { teleport: Teleport }): PresenceExtension {
    const extension = new PresenceExtension({
      connections: [...this._getConnections()], // TODO(mykola): include remote peer id?
      resendAnnounce: this._params.resendAnnounce,
      onAnnounce: async (peerState) => {
        this._saveNewState(peerState);
        this._propagateAnnounce(peerState);
      }
    });
    this._presenceExtensions.set({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId }, extension);
    this._reconcileConnections();
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
      this._peerStates.set(peerState.peerId, peerState);
    }
  }

  private _propagateAnnounce(peerState: PeerState) {
    this._presenceExtensions.forEach(async (presenceExtension, { localPeerId, remotePeerId }) => {
      if (localPeerId.equals(peerState.peerId) || remotePeerId.equals(peerState.peerId)) {
        return;
      }
      await presenceExtension.sendAnnounce(peerState);
    });
  }

  private _reconcileConnections() {
    this._presenceExtensions.forEach((presenceExtension) => {
      presenceExtension.setConnections(this._getConnections());
    });
  }
}
