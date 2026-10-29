//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { ScriptNamespace } from './src/namespace.ts';
import * as ScriptCapabilities from './src/types/ScriptCapabilities.ts';
import * as ScriptEvents from './src/types/ScriptEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ScriptNamespace.key,
    name: 'Scripts',
    author: 'DXOS',
    description: trim`
      Write, deploy, and run custom TypeScript functions as ECHO objects directly inside your Composer spaces.
      Scripts execute on the Cloudflare Workers-based EDGE runtime and have access to the full DXOS SDK,
      Effect-TS, and a curated set of third-party libraries including HTTP, JSON, CSV, and date utilities.
      An AI Script assistant wires CRUD, deploy, invoke, and invocation-inspection operations as tools
      so an agent can scaffold, iterate, and test functions entirely within a chat session.
    `,
    icon: { key: 'ph--code--regular', hue: 'sky' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-scripts-dark.png' }],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'Compiler',
      {
        provides: [ScriptCapabilities.Compiler],
        // Genuine runtime event: the compiler is only loaded on demand (`hooks/useCompiler.ts`), not at startup.
        activatesOn: ScriptEvents.SetupCompiler,
      },
      () => import('./src/capabilities/compiler.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: ScriptNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Dialog, AppRole.ObjectProperties, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [ScriptCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
