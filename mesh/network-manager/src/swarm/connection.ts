//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';

import { SignalApi } from '../signal';
import { WebrtcConnection } from './webrtc-connection';

export interface Connection {
  stateChanged: Event<WebrtcConnection.State>;

  closed: Event;

  remoteId: PublicKey

  sessionId: PublicKey

  state: WebrtcConnection.State;

  connect(): void;

  signal (msg: SignalApi.SignalMessage): void;

  close (): Promise<void>;
}
