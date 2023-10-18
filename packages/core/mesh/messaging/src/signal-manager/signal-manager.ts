//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { type CommandTrace, type SignalStatus } from '../signal-client';
import { type Message, type SignalMethods } from '../signal-methods';

/**
 *
 */
export interface SignalManager extends SignalMethods {
  statusChanged: Event<SignalStatus[]>;
  commandTrace: Event<CommandTrace>;
  swarmEvent: Event<{ topic: PublicKey; swarmEvent: SwarmEvent }>;
  onMessage: Event<Message>;

  getStatus(): SignalStatus[];

  open(): Promise<void>;
  close(): Promise<void>;
}
