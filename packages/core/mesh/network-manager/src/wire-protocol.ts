//
// Copyright 2022 DXOS.org
//

import { type Duplex } from 'node:stream';

import { type PublicKey } from '@dxos/keys';
import { Teleport, type TeleportProps } from '@dxos/teleport';

export type WireProtocolProps = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  topic: PublicKey;
};

export type WireProtocolProvider = (params: WireProtocolProps) => WireProtocol;

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
 * @param defaultProps Optionally provide default Teleport params that might be overridden by factory callers.
 * @returns
 */
export const createTeleportProtocolFactory = (
  onConnection: (teleport: Teleport) => Promise<void>,
  defaultProps?: Partial<TeleportProps>,
): WireProtocolProvider => {
  return (params) => {
    const teleport = new Teleport({ ...defaultProps, ...params });
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
