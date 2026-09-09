//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

export const SettingsSync = Capability.lazyModule(
  'SettingsSync',
  {
    requires: [ClientCapabilities.Client, Capabilities.PluginManager, Capabilities.AtomRegistry],
    provides: [AppCapabilities.SettingsSync],
    // Runtime event: the settings space this projects into arrives with the space list, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./settings-sync'),
);
