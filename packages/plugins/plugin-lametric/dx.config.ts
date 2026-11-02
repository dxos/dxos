//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { LaMetricNamespace } from './src/namespace.ts';
import * as LaMetricCapabilities from './src/types/LaMetricCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LaMetricNamespace.key,
    name: 'LaMetric',
    author: 'DXOS',
    description: 'Show a space on a LaMetric TIME — progress while a task runs, statistics otherwise.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lametric',
    icon: { key: 'ph--squares-four--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [LaMetricCapabilities.SettingsAtom],
    }),
    // Headless: the display has to stay live with no surface rendered, so this is gated on spaces being
    // ready rather than on the plugin's own UI appearing.
    Capability.lazyModule(
      'DashboardDriver',
      {
        requires: [Capabilities.AtomRegistry, SpaceCapabilities.Dashboard, LaMetricCapabilities.SettingsAtom],
        provides: [LaMetricCapabilities.PushStatus],
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/dashboard-driver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: LaMetricNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
  ],
});

export const { meta, make } = config;

export default config;
