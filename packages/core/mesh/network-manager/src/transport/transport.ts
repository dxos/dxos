//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage } from '../signal';

/**
 * Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.
 */
export interface Transport {
  closed: Event;
  connected: Event;
  errors: ErrorStream;
  signal(signal: Signal): Promise<void>; // TODO(burdon): Remove async?
  close(): Promise<void>;
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
  sendSignal: (msg: SignalMessage) => Promise<void>; // TODO(burdon): Remove async?
};

export interface TransportFactory {
  create(options: TransportOptions): Transport;
}
