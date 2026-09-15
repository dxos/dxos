//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type ErrorStream } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

export enum TransportKind {
  WEB_RTC = 'WEB-RTC',
  WEB_RTC_PROXY = 'WEB-RTC_PROXY',
  MEMORY = 'MEMORY',
  TCP = 'TCP',
}

/**
 * Abstraction over a P2P connection transport.
 * Currently, WebRTC or in-memory.
 */
// TODO(burdon): Create abstract base class for common logging and error handling?
export interface Transport {
  closed: Event;
  connected: Event;
  errors: ErrorStream;

  open(): Promise<this>;
  close(): Promise<this>;

  /**
   * Handle message from signaling.
   */
  onSignal(signal: Signal): Promise<void>;

  /**
   * Transport-specific stats.
   */
  getStats(): Promise<TransportStats>;

  /**
   * Transport-specific connection details.
   */
  getDetails(): Promise<string>;
}

/**
 * Common options for all transports.
 */
export type TransportOptions = {
  ownPeerKey: string;
  remotePeerKey: string;

  topic: string;
  /**
   * Did local node initiate this connection.
   */
  initiator: boolean;

  /**
   * Wire protocol for data stream.
   */
  stream: NodeJS.ReadWriteStream;

  /**
   * Sends signal message to remote peer.
   */
  sendSignal: (signal: Signal) => Promise<void>;

  sessionId?: PublicKey;

  timeout?: number;
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
