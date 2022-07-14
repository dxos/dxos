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
   * 
   */
  // TODO(burdon): Document.
  join (topic: PublicKey, peerId: PublicKey): void

  /**
   * 
   */
  // TODO(burdon): Document.
  leave (topic: PublicKey, peerId: PublicKey): void
}

/**
 * Signal peer messaging interface.
 */
export interface SignalMessaging {
  /**
   *
   */
  // TODO(burdon): Document.
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
  onSignal: Event<SignalApi.SignalMessage>

  getStatus (): SignalApi.Status[]
  destroy(): Promise<void>
}
