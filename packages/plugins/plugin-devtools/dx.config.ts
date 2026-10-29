//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { DevtoolsNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DevtoolsNamespace.key,
    name: 'Devtools',
    author: 'DXOS',
    description: trim`
      DevtoolsPlugin is the developer inspector for DXOS Composer. It adds a structured DevTools tree
      to the floating debug panel — grouped into Client, HALO, ECHO, Mesh, and EDGE sub-sections —
      exposing panel views for config, storage, logs, diagnostics, identity, devices, feeds,
      objects, schemas, automerge internals, network topology, EDGE workflows, and invocation
      traces, all driven by the @dxos/devtools component library.

      Additional utilities include an app-graph inspector, a ToolsExplorer connected to the DXOS MCP
      introspect service, and a globalThis helper for manual storage-version testing.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-devtools',
    icon: { key: 'ph--toolbox--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [AppCapabilities.AppGraph],
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.pluginAsset({
      pluginId: DevtoolsNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.reactContext(() => import('./src/capabilities/react-context.tsx', { with: { type: 'module-url' } })),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.debug.surface.page',
        'org.dxos.role.deckCompanion.devtoolsOverview',
        'org.dxos.role.devtoolsOverview',
      ],
    }),
    Capability.lazyModule(
      'setup-devtools',
      { environments: ['browser', 'node', 'tauri'], provides: [] },
      () => import('./src/capabilities/setup-devtools.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
