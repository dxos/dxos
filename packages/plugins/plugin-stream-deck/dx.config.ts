//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { StreamDeckNamespace } from './src/namespace.ts';
import * as StreamDeckCapabilities from './src/types/StreamDeckCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StreamDeckNamespace.key,
    name: 'Stream Deck',
    author: 'DXOS',
    description: 'Project a space onto Stream Deck hardware — favorites on keys, progress and stats on dials.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stream-deck',
    icon: { key: 'ph--squares-four--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'BridgeDriver',
      {
        environments: ['browser', 'tauri'],
        requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker, SpaceCapabilities.Dashboard],
        provides: [StreamDeckCapabilities.BridgeStatus],
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/bridge-driver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.deckCompanion.streamDeck', 'org.dxos.role.statusIndicator'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: StreamDeckNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
  ],
});

export const { meta, make } = config;

export default config;
