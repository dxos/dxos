//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import * as FreeqCapabilities from '../FreeqCapabilities';
import { ConnectionManager } from '../services';

/** Contributes the shared, ref-counted freeq connection manager. */
export const ConnectionManagerModule = Capability.makeModule<ConnectionManager>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(FreeqCapabilities.ConnectionManager, new ConnectionManager());
  }),
);

export default ConnectionManagerModule;
