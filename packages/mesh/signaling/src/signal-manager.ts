//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { SwarmEvent } from './proto/gen/dxos/mesh/signal';
import { SwarmMessage } from './proto/gen/dxos/mesh/swarm';
import { Any } from './proto/gen/google/protobuf';
import { CommandTrace, SignalClient, SignalStatus } from './signal-client';

export interface SignalManager extends SignalClient {
  statusChanged: Event<SignalStatus[]>
  commandTrace: Event<CommandTrace>
  swarmEvent: Event<[topic: PublicKey, swarmEvent: SwarmEvent]>
  onMessage: Event<[author: PublicKey, recipient: PublicKey, networkMessage: SwarmMessage]>

  getStatus (): SignalStatus[]
  destroy(): Promise<void>
}
