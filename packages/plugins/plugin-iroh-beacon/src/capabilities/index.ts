//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { BeaconCapabilities } from './beacon-service';

export const BeaconServiceModule = Capability.lazyModule(
  'BeaconServiceModule',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [BeaconCapabilities.State],
    // Genuine runtime event: spaces become ready when the client observes them, not at a fixed
    // startup point.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./beacon-service'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
