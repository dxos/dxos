//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { PreviewEvents } from '../events';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [], activatesOn: PreviewEvents.Start },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.cardContent'],
});
