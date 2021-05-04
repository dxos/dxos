//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { Event } from '@dxos/util';

import { SignalApi } from './signal-api';

export interface SignalManager {
  statusChanged: Event<SignalApi.Status[]>;

  commandTrace: Event<SignalApi.CommandTrace>;

  peerCandidatesChanged: Event<[topic: PublicKey, candidates: PublicKey[]]>;

  onSignal: Event<SignalApi.SignalMessage>;

  getStatus (): SignalApi.Status[];

  join (topic: PublicKey, peerId: PublicKey): void;

  leave (topic: PublicKey, peerId: PublicKey): void;

  lookup (topic: PublicKey): void;

  offer (msg: SignalApi.SignalMessage): Promise<SignalApi.Answer>;

  signal (msg: SignalApi.SignalMessage): void;
}
