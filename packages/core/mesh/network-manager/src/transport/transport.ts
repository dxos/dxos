//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type ErrorStream } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { type DuplexStream } from '@dxos/teleport';

export enum TransportKind {
  WEB_RTC = 'WEB-RTC',
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
  /** Undefined when there is nothing to sample, such as a transport that has closed. */
  getStats(): Promise<TransportStats | undefined>;

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
  stream: DuplexStream;

  /**
   * Sends signal message to remote peer.
   */
  sendSignal: (signal: Signal) => Promise<void>;

  sessionId?: PublicKey;

  timeout?: number;
};

/**
 * How long `Connection` waits for a transport to connect before aborting.
 *
 * Lives here so a transport can size its own internal waits against it rather than duplicating the
 * number: `Connection` is the owner of the deadline that should actually fire.
 */
export const TRANSPORT_CONNECTION_TIMEOUT = 10_000;

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
