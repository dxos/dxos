//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { CommandTrace, SignalStatus } from './signal-client';
import { Message, SignalMethods } from './signal-methods';

export interface SignalManager extends SignalMethods {
  statusChanged: Event<SignalStatus[]>;
  commandTrace: Event<CommandTrace>;
  swarmEvent: Event<{ topic: PublicKey; swarmEvent: SwarmEvent }>;
  onMessage: Event<Message>;

  getStatus(): SignalStatus[];
  destroy(): Promise<void>;
}
