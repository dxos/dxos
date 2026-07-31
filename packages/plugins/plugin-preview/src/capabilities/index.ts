//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [] },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.cardContent'],
});
