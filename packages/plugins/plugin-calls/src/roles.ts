//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Role token for the devtools-overview sub-surface inside the devtools panel. */
export const DevtoolsOverview: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.calls.role.devtoolsOverview',
);
