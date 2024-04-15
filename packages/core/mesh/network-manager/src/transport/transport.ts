//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type ErrorStream } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

export enum TransportKind {
  SIMPLE_PEER = 'SIMPLE_PEER',
  SIMPLE_PEER_PROXY = 'SIMPLE_PEER_PROXY',
  LIBDATACHANNEL = 'LIBDATACHANNEL',
  MEMORY = 'MEMORY',
  TCP = 'TCP',
}

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
// TODO(burdon): Abstract base class for logging.
export interface Transport {
  closed: Event;
  connected: Event;
  errors: ErrorStream;

  open(): Promise<void>;
  close(): Promise<void>;

  signal(signal: Signal): Promise<void>;

  /**
   * Transport-specific stats.
   */
  getStats(): Promise<TransportStats>;

  /**
   * Transport-specific connection details.
   */
  getDetails(): Promise<string>;
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
