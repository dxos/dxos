//
// Copyright 2025 DXOS.org
//

import { Role } from '@dxos/app-framework';

/** Slot for the devtools-overview sub-surface inside the debug panel. */
export const DevtoolsOverview: Role.Role<Record<string, unknown>> = Role.make(
  'org.dxos.plugin.debug.role.devtoolsOverview',
);
