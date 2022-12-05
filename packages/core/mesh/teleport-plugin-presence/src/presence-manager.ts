//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { Teleport } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { PresenceExtension } from './presence-extension';

export type PresenceManagerParams = {
  resendAnnounce: number;
  offlineTimeout: number;
};

export class PresenceManager {
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
        this._presenceExtensions.forEach(async (presenceExtension, { localPeerId, remotePeerId }) => {
          if (localPeerId === peerState.peerId || remotePeerId === peerState.peerId) {
            return;
          }
          await presenceExtension.sendAnnounce(peerState);
        });
      }
    });

    this._presenceExtensions.set({ localPeerId: teleport.localPeerId, remotePeerId: teleport.remotePeerId }, extension);
    this._reconcileConnections();
    teleport.addExtension('dxos.mesh.teleport.presence', extension);

    return extension;
  }

  private _getConnections(): PublicKey[] {
    return [...this._presenceExtensions.keys()].map(({ localPeerId }) => localPeerId);
  }

  private _reconcileConnections() {
    this._presenceExtensions.forEach((presenceExtension) => {
      presenceExtension.setConnections(this._getConnections());
    });
  }
}
