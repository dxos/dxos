//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

export enum TransportKind {
  SIMPLE_PEER = 'SIMPLE_PEER',
  LIBDATACHANNEL = 'LIBDATACHANNEL',
  SIMPLE_PEER_PROXY = 'SIMPLE_PEER_PROXY',
  MEMORY = 'MEMORY',
  TCP = 'TCP',
}

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
export interface Transport {
  closed: Event;
  connected: Event;
  errors: ErrorStream;

  destroy(): Promise<void>;
  signal(signal: Signal): void;
}

export type TransportOptions = {
  /**
   * Did local node initiate this connection.
   */
  initiator: boolean;

  /**
   * Wire protocol.
   */
  stream: NodeJS.ReadWriteStream;

  /**
   * Send a signal message to remote peer.
   */
  sendSignal: (signal: Signal) => Promise<void>; // TODO(burdon): Remove async?

  timeout?: number;
};

/**
 *
 */
export interface TransportFactory {
  createTransport(options: TransportOptions): Transport;
}
