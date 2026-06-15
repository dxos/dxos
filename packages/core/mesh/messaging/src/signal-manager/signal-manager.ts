//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Lifecycle } from '@dxos/context';

import { type SignalMethods, type SignalStatus } from '../signal-methods';

/**
 * Manages a collection of signaling clients.
 */
export interface SignalManager extends SignalMethods, Required<Lifecycle> {
  statusChanged?: Event<SignalStatus[]>;
  getStatus?: () => SignalStatus[];
}
