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
export interface Transport {
  closed: Event;

  connected: Event;

  errors: ErrorStream;

  signal (msg: SignalApi.SignalMessage): void;

  close (): Promise<void>;
}

export interface TransportOptions {
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

export type TransportFactory = (options: TransportOptions) => Transport;
