//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
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
    // The settings space arrives with the space list; on a first run that precedes the identity, so the module runs
    // again when `CreateIdentity` resets `IdentityCreated`.
    activatesOn: ActivationEvent.oneOf(ClientEvents.SpacesAvailable, ClientEvents.IdentityCreated),
  },
  () => import('./settings-sync.ts'),
);
