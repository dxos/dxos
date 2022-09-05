//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { SwarmEvent } from './proto/gen/dxos/mesh/signal';
import { Any } from './proto/gen/google/protobuf';
import { CommandTrace, SignalStatus } from './signal-client';
import { SignalMethods } from './signal-methods';

export interface SignalManager extends SignalMethods {
  statusChanged: Event<SignalStatus[]>
  commandTrace: Event<CommandTrace>
  swarmEvent: Event<[topic: PublicKey, swarmEvent: SwarmEvent]>
  onMessage: Event<[author: PublicKey, recipient: PublicKey, payload: Any]>

  getStatus (): SignalStatus[]
  close(): Promise<void>
}
