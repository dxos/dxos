//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { trim } from '@dxos/util';

import { RegistryCapabilities, type RegistryPluginOptions } from '#types';

import { RegistryNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<RegistryPluginOptions> = Plugin.config<RegistryPluginOptions>({
  plugin: {
    key: RegistryNamespace.key,
    name: 'Plugins',
    author: 'DXOS',
    description: trim`
      Plugin management system for discovering, installing, and configuring workspace extensions.
      Browse available plugins and customize your workspace capabilities.
    `,
    icon: { key: 'ph--squares-four--regular' },
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.commands(() => import('#commands', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'DevPluginLoader',
      {
        requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings],
        provides: [],
      },
      () => import('./src/capabilities/dev-plugin-loader.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'PrivateRegistry',
      {
        requires: [Capabilities.PluginManager, ClientCapabilities.Client, ClientCapabilities.IdentityService],
        provides: [],
        // An initialized client, since the module reads the identity synchronously.
        activatesOn: ClientEvents.Initialized,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/private-registry.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Dialog],
    }),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [RegistryCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
