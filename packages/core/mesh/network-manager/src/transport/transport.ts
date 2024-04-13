//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type ErrorStream } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

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

  /**
   * Transport-specific stats.
   */
  getStats(): Promise<TransportStats>;
  /**
   * Transport-specific connection details.
   */
  getDetails(): Promise<string>;
  destroy(): Promise<void>;

  // TODO(burdon): Make async.
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

  sessionId?: PublicKey;
};

/**
 *
 */
export interface TransportFactory {
  createTransport(options: TransportOptions): Transport;
}

export type TransportStats = {
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  rawStats?: any;
};
