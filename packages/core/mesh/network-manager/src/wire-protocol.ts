//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type DuplexStream, Teleport, type TeleportProps } from '@dxos/teleport';

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
  stream: DuplexStream;

  /**
   * Emitted when the byte pipe ends; the swarm connection tears down in response.
   */
  closed: Event<Error | undefined>;

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
      closed: teleport.closed,
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
