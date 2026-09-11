//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { LaMetricCapabilities } from '#types';

// Headless: the display has to stay live with no surface rendered, so this is gated on spaces being
// ready rather than on the plugin's own UI appearing.
export const DashboardDriver = Capability.lazyModule(
  'DashboardDriver',
  {
    requires: [Capabilities.AtomRegistry, SpaceCapabilities.Dashboard, LaMetricCapabilities.SettingsAtom],
    provides: [LaMetricCapabilities.PushStatus],
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./dashboard-driver.ts'),
);

export const LaMetricSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [LaMetricCapabilities.SettingsAtom],
});
