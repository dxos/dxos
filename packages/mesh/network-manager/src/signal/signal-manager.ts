//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { NetworkMessage } from '../proto/gen/dxos/mesh/networkMessage';
import { SwarmEvent } from '../proto/gen/dxos/mesh/signal';
import { SignalApi } from './signal-api';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join (topic: PublicKey, peerId: PublicKey): void

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave (topic: PublicKey, peerId: PublicKey): void
}

export interface SignalManager extends SignalConnection {
  statusChanged: Event<SignalApi.Status[]>
  commandTrace: Event<SignalApi.CommandTrace>
  swarmEvent: Event<[topic: PublicKey, swarmEvent: SwarmEvent]>
  onMessage: Event<[author: PublicKey, recipient: PublicKey, networkMessage: NetworkMessage]>;

  getStatus (): SignalApi.Status[]
  destroy(): Promise<void>
  /**
   * Send message to peer.
   */
  message (author: PublicKey, recipient: PublicKey, msg: NetworkMessage): Promise<void>
}
