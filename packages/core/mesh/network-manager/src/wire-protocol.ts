//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { discoveryKey } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { Teleport } from '@dxos/teleport';

import { MeshProtocolProvider } from './protocol-factory';

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

  /**
   * @deprecated Only for devtools comapatibility.
   */
  protocol?: Protocol;

  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * @deprecated
 */
export const adaptProtocolProvider =
  (factory: MeshProtocolProvider): WireProtocolProvider =>
  ({ initiator, localPeerId, remotePeerId, topic }) => {
    const protocol = factory({ channel: discoveryKey(topic), initiator });
    return {
      initialize: () => protocol.open(),
      destroy: () => protocol.close(),
      stream: protocol.stream,
      protocol
    };
  };

/**
 * Create a wire-protocol provider backed by a teleport instance.
 * @param onConnection Called after teleport is initialized for the session. Protocol extensions could be attached here.
 * @returns 
 */
export const createTeleportProtocolFactory = (onConnection: (teleport: Teleport) => Promise<void>): WireProtocolProvider => {
  return params => {
    const teleport = new Teleport(params);
    return {
      stream: teleport.stream,
      initialize: async () => {
        await teleport.open();
        await onConnection(teleport);
      },
      destroy: async () => {
        await teleport.close();
      },
    }
  }
}