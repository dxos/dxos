//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [] },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
