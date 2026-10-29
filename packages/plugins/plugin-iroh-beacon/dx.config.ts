//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { BeaconCapabilities } from './src/capabilities/beacon-service.ts';
import { IrohBeaconNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: IrohBeaconNamespace.key,
    name: 'Iroh Beacon',
    author: 'DXOS',
    description: 'Peer-to-peer presence beacon for cross-tab and cross-peer liveness.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-iroh-beacon',
    icon: { key: 'ph--broadcast--regular', hue: 'green' },
    tags: ['labs'],
  },
  modules: [
    // Beacon service: creates transport + starts broadcasting.
    Capability.lazyModule(
      'BeaconServiceModule',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [BeaconCapabilities.State],
        // Genuine runtime event: spaces become ready when the client observes them, not at a fixed
        // startup point.
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/beacon-service.ts', { with: { type: 'module-url' } }),
    ),
    // Status indicator surface.
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.StatusIndicator],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
