//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const Surface = AppCapability.surface(() => import('./surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
