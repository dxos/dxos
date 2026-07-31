//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.plugin.statusBar.role.footer', 'org.dxos.plugin.statusBar.role.statusBar', 'org.dxos.plugin.statusBar.role.versionInfo'],
});
