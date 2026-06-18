//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/**
 * Slot for call-specific debug info inside the devtools panel.
 * Filled by plugin-calls; same NSID as `DevtoolsOverview` in plugin-calls/src/roles.ts.
 */
export const DevtoolsOverview: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.calls.role.devtoolsOverview',
);
