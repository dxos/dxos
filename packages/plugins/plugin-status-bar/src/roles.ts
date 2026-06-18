//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Role token for the main status-bar container. */
export const StatusBar: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.statusBar',
);

/** Role token for the status-bar r1-footer region. */
export const StatusBarFooter: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.footer',
);

/** Role token for the version-info surface. */
export const VersionInfo: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.versionInfo',
);
