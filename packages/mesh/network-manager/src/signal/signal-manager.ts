//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';

import { SignalApi } from './signal-api';

export interface SignalConnection {
  lookup (topic: PublicKey): void
  offer (msg: SignalApi.SignalMessage): Promise<SignalApi.Answer>
  signal (msg: SignalApi.SignalMessage): Promise<void>
}

export interface SignalManager extends SignalConnection {
  statusChanged: Event<SignalApi.Status[]>
  commandTrace: Event<SignalApi.CommandTrace>
  peerCandidatesChanged: Event<[topic: PublicKey, candidates: PublicKey[]]>
  onSignal: Event<SignalApi.SignalMessage>
  join (topic: PublicKey, peerId: PublicKey): void
  leave (topic: PublicKey, peerId: PublicKey): void
  getStatus (): SignalApi.Status[]
  destroy(): Promise<void>
}
