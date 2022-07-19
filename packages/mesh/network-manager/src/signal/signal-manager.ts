//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { SignalApi } from './signal-api';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Find peers (triggers async event).
   */
  lookup (topic: PublicKey): void

  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join (topic: PublicKey, peerId: PublicKey): void

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave (topic: PublicKey, peerId: PublicKey): void
}

/**
 * Signal peer messaging interface.
 */
export interface SignalMessaging {
  /**
   * Offer/answer RPC.
   */
  offer (msg: Message): Promise<Answer>

  /**
   * Send message to peer.
   */
  signal (msg: Message): Promise<void>
}

export interface SignalManager extends SignalConnection, SignalMessaging {
  statusChanged: Event<SignalApi.Status[]>
  commandTrace: Event<SignalApi.CommandTrace>
  peerCandidatesChanged: Event<[topic: PublicKey, candidates: PublicKey[]]>
  onSignal: Event<Message>

  getStatus (): SignalApi.Status[]
  destroy(): Promise<void>
}
