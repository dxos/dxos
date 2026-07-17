//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

export const Surface = Capability.lazyModule(
  'Surface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./surface'),
);
