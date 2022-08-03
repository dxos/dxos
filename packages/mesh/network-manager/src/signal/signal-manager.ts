//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { Answer, SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
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
  offer (msg: SignalMessage): Promise<Answer>

  /**
   * Send message to peer.
   */
  signal (msg: SignalMessage): Promise<void>
}

export interface SignalManager extends SignalConnection {
  statusChanged: Event<SignalApi.Status[]>
  commandTrace: Event<SignalApi.CommandTrace>
  peerCandidatesChanged: Event<[topic: PublicKey, candidates: PublicKey[]]>
  onSignal: Event<SignalMessage>

  getStatus (): SignalApi.Status[]
  destroy(): Promise<void>
  /**
   * Send message to peer.
   */
  signal (msg: SignalMessage): Promise<void>
}
