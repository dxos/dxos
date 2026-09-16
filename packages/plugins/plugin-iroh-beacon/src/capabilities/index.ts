//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { translations } from '#translations';

import { BeaconCapabilities } from './beacon-service.ts';

export const BeaconServiceModule = Capability.lazyModule(
  'BeaconServiceModule',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [BeaconCapabilities.State],
    // Genuine runtime event: spaces become ready when the client observes them, not at a fixed
    // startup point.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./beacon-service.ts'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.statusIndicator'],
});
export const Translations = AppCapability.translations(translations);
