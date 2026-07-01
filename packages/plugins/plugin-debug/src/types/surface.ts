//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Slot for the devtools-overview sub-surface inside the debug panel. */
export const DevtoolsOverview: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.debug.role.devtoolsOverview',
);
