//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { ErrorStream, Event } from '@dxos/util';

import { SignalApi } from '../signal';

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
export interface Connection {
  stateChanged: Event<ConnectionState>;

  closed: Event;

  errors: ErrorStream;

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
  /**
   * Initial state. Connection is registered but no attempt to connect to the remote peer has been performed. Might mean that we are waiting for the answer signal from the remote peer.
   */
  INITIAL = 'INITIAL',

  /**
   * Originating a connection.
   */
  INITIATING_CONNECTION = 'INITIATING_CONNECTION',

  /**
   * Waiting for a connection to be originated from the remote peer.
   */
  WAITING_FOR_CONNECTION = 'WAITING_FOR_CONNECTION',

  /**
   * Connection is established.
   */
  CONNECTED = 'CONNECTED',

  /**
   * Connection closed.
   */
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
