//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { SignalApi } from '../signal';

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
export interface Connection {
  stateChanged: Event<ConnectionState>;

  closed: Event;

  remoteId: PublicKey

  sessionId: PublicKey

  state: ConnectionState;

  connect(): void;

  signal (msg: SignalApi.SignalMessage): void;

  close (): Promise<void>;
}

/**
 * State machine for each connection.
 */
export enum ConnectionState {
  WAITING_FOR_ANSWER = 'WAITING_FOR_ANSWER',
  INITIATING_CONNECTION = 'INITIATING_CONNECTION',
  WAITING_FOR_CONNECTION = 'WAITING_FOR_CONNECTION',
  CONNECTED = 'CONNECTED',
  CLOSED = 'CLOSED',
}

export interface ConnectionOptions {
  /**
   * Did local node initiate this connection.
   */
  initiator: boolean,

  ownId: PublicKey,
  remoteId: PublicKey,
  sessionId: PublicKey,
  topic: PublicKey,

  /**
   * Wire protocol.
   */
  protocol: Protocol,

  /**
   * Send a signal message to remote peer.
   */
  sendSignal: (msg: SignalApi.SignalMessage) => Promise<void>,
}

export type ConnectionFactory = (options: ConnectionOptions) => Connection;
