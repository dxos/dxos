//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { PublicKey } from '@dxos/keys';
import { Teleport } from '@dxos/teleport';

export type WireProtocolParams = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  topic: PublicKey;
};

export type WireProtocolProvider = (params: WireProtocolParams) => WireProtocol;

/**
 * Application-specific network protocol that is used when a connection to a peer is established.
 * Will implement high-level logic, like replication, authentication, etc.
 */
export interface WireProtocol {
  stream: Duplex;

  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * Create a wire-protocol provider backed by a teleport instance.
 * @param onConnection Called after teleport is initialized for the session. Protocol extensions could be attached here.
 * @returns
 */
export const createTeleportProtocolFactory = (
  onConnection: (teleport: Teleport) => Promise<void>
): WireProtocolProvider => {
  return (params) => {
    const teleport = new Teleport(params);
    return {
      stream: teleport.stream,
      initialize: async () => {
        await teleport.open();
        await onConnection(teleport);
      },
      destroy: async () => {
        await teleport.close();
      }
    };
  };
};
