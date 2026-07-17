//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { PaymentsCapabilities } from '#types';

export const Settings = Capability.lazyModule(
  'Settings',
  { provides: [AppCapabilities.Settings, PaymentsCapabilities.Settings] },
  () => import('./settings'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
