//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';
import { type ConnectionManager } from './services';

/** The shared, ref-counted freeq connection manager. */
export const ConnectionManager = Capability.make<ConnectionManager>(
  `${meta.profile.key}.capability.connection-manager`,
);
