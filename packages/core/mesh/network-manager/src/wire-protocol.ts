//
// Copyright 2022 DXOS.org
//

import { type Duplex } from 'node:stream';

import { type PublicKey } from '@dxos/keys';
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

  open(sessionId?: PublicKey): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

/**
 * Create a wire-protocol provider backed by a teleport instance.
 * @param onConnection Called after teleport is initialized for the session. Protocol extensions could be attached here.
 * @returns
 */
export const createTeleportProtocolFactory = (
  onConnection: (teleport: Teleport) => Promise<void>,
): WireProtocolProvider => {
  return (params) => {
    const teleport = new Teleport(params);
    return {
      stream: teleport.stream,
      open: async (sessionId?: PublicKey) => {
        await teleport.open(sessionId);
        await onConnection(teleport);
      },
      close: async () => {
        await teleport.close();
      },
      abort: async () => {
        await teleport.abort();
      },
    };
  };
};
