//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { FreeqNamespace } from './namespace.ts';
import { type ConnectionManager as ConnectionManagerService } from './services/index.ts';

/** The shared, ref-counted freeq connection manager. */
export const ConnectionManager = Capability.makeSingleton<ConnectionManagerService>()(
  `${FreeqNamespace.key}.capability.connectionManager`,
);
