//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { trim } from '@dxos/util';

import { MessengerNamespace } from './src/namespace.ts';
import * as MessengerCapabilities from './src/types/MessengerCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MessengerNamespace.key,
    name: 'Messenger',
    author: 'DXOS',
    description: trim`
      Cross-space notifications: space invitations and notices from contacts and bots, relayed
      through the HALO inbox as signed messages. Each message is stored once in a feed in the
      user's default space and listed in a deck companion panel with an unread badge.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-messenger',
    icon: { key: 'ph--envelope--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [MessengerCapabilities.NotificationsContainers],
      },
    ),
    // Headless: invitations must be stored (and toasted) whether or not the panel was ever opened, so
    // this rides the space list rather than the plugin's own UI.
    Capability.lazyModule(
      'InboxMaterializer',
      {
        requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker, ClientCapabilities.Client],
        provides: [MessengerCapabilities.NotificationsContainers],
        activatesOn: ClientEvents.SpacesAvailable,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/inbox-materializer.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: MessengerNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.deckCompanion.messenger'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'Sender',
      {
        requires: [ClientCapabilities.Client],
        provides: [MessengerCapabilities.Sender],
        activatesOn: ClientEvents.Initialized,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/sender.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
