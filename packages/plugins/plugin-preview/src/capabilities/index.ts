//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [] },
  () => import('./preview-popover'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
