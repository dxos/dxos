//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { BeaconCapabilities } from './beacon-service';

export const BeaconServiceModule = Capability.lazyModule(
  'BeaconServiceModule',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry],
    provides: [BeaconCapabilities.State],
  },
  () => import('./beacon-service'),
);

export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
