//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import { trim } from '@dxos/util';

import { SandboxNamespace } from './src/namespace.ts';
import * as SandboxCapabilities from './src/types/SandboxCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SandboxNamespace.key,
    name: 'Sandbox',
    author: 'DXOS',
    description: trim`
      Sandbox plugin for DXOS Composer that provides isolated shell environments.
      Each sandbox is a persistent container identified by an ECHO object in the space.
      An AI Sandbox assistant provides tools to create sandboxes, run shell commands,
      and transfer files between ECHO and the sandbox filesystem.
    `,
    icon: { key: 'ph--terminal--regular', hue: 'green' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sandbox',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'LocalLauncher',
      { provides: [SandboxCapabilities.LocalLauncher], activatesOn: ActivationEvents.Startup, environments: ['tauri'] },
      () => import('./src/capabilities/local-launcher.ts', { with: { type: 'module-url' } }),
    ),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'SandboxMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: SandboxNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    Capability.lazyModule(
      'ProjectTemplates',
      {
        requires: [ClientCapabilities.Config],
        provides: [ProjectCapabilities.Template],
        activatesOn: ProjectsEvents.Start,
      },
      () => import('./src/capabilities/project-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
    AppCapability.layerSpec(() => import('./src/capabilities/sandbox-service.ts', { with: { type: 'module-url' } }), {
      name: 'SandboxLayer',
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [SandboxCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
