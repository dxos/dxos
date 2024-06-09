//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { type Message, type SignalMethods, type SignalStatus } from '../signal-methods';

/**
 * Manages a collection of signaling clients.
 */
export interface SignalManager extends SignalMethods {
  open(): Promise<void>;
  close(): Promise<void>;

  getStatus(): SignalStatus[];

  statusChanged: Event<SignalStatus[]>;
  swarmEvent: Event<{ topic: PublicKey; swarmEvent: SwarmEvent }>;
  onMessage: Event<Message>;
}
