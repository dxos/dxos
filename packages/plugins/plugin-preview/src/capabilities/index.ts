//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.cardContent'],
});
