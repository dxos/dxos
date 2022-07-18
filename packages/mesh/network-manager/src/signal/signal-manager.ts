//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { SignalApi } from './signal-api';

// TODO(burdon): Document methods.
export interface SignalConnection {
  /**
   * Find peers (triggers async event).
   */
  lookup (topic: PublicKey): void

  /**
   *
   */
  // TODO(burdon): Document.
  offer (msg: SignalApi.SignalMessage): Promise<SignalApi.Answer>

  /**
   * Send message to peer.
   */
  signal (msg: SignalApi.SignalMessage): Promise<void>
}

export interface SignalManager extends SignalConnection {
  statusChanged: Event<SignalApi.Status[]>
  commandTrace: Event<SignalApi.CommandTrace>
  peerCandidatesChanged: Event<[topic: PublicKey, candidates: PublicKey[]]>
  onSignal: Event<SignalApi.SignalMessage>

  getStatus (): SignalApi.Status[]
  join (topic: PublicKey, peerId: PublicKey): void
  leave (topic: PublicKey, peerId: PublicKey): void
  destroy(): Promise<void>
}
