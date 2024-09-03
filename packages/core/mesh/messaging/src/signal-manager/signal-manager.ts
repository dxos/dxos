//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';

import { type SignalMethods, type SignalStatus } from '../signal-methods';

/**
 * Manages a collection of signaling clients.
 */
export interface SignalManager extends SignalMethods {
  open(): Promise<void>;
  close(): Promise<void>;
  getStatus(): SignalStatus[];

  statusChanged: Event<SignalStatus[]>;
}
