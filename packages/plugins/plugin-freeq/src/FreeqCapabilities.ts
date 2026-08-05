//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';
import { type ConnectionManager as ConnectionManagerService } from './services';

/** The shared, ref-counted freeq connection manager. */
export const ConnectionManager = Capability.makeSingleton<ConnectionManagerService>()(
  `${meta.profile.key}.capability.connectionManager`,
);
