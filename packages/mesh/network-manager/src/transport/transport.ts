//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';

import { SignalMessage } from '../signal';

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
export interface Transport {
  closed: Event
  connected: Event
  errors: ErrorStream
  signal (msg: SignalMessage): Promise<void> // TODO(burdon): Remove async?
  close (): Promise<void>
}

export interface TransportOptions {
  /**
   * Did local node initiate this connection.
   */
  initiator: boolean

  ownId: PublicKey
  remoteId: PublicKey
  sessionId: PublicKey
  topic: PublicKey

  /**
   * Wire protocol.
   */
  stream: NodeJS.ReadWriteStream

  /**
   * Send a signal message to remote peer.
   */
  sendSignal: (msg: SignalMessage) => Promise<void> // TODO(burdon): Remove async?
}

export type TransportFactory = (options: TransportOptions) => Transport
