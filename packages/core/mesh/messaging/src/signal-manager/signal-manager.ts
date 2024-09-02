//
// Copyright 2020 DXOS.org
//

import { type Lifecycle } from '@dxos/context';

import { type SignalStatus, type SignalMethods } from '../signal-methods';

/**
 * Manages a collection of signaling clients.
 */
export interface SignalManager extends SignalMethods, Required<Lifecycle> {
  getStatus: () => SignalStatus[];
}
