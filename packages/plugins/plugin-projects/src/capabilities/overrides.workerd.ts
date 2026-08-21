//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities } from '#types';

export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./templates'),
);
