//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { CodeGraphNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CodeGraphNamespace.key,
    name: 'Code Graph',
    author: 'DXOS',
    description: trim`
      A canvas of the codebase, built from code-index: packages, files and symbols as boxes and their
      imports and dependencies as arrows. The assistant fills and reshapes the graph by querying the index,
      and the canvas lays it out with the illustrator's semantic engine, a force-directed layout, or by rank.

      Dev only: the index is reached through a vite dev-server route (\`vite dev\` or \`tauri dev\`) that runs
      \`code-index mcp\` beside the app.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code-graph',
    icon: { key: 'ph--graph--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    // The command bar's judge is a decision model, and TypeSafe is the plugin that serves them.
    dependsOn: ['org.dxos.plugin.typesafe'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: CodeGraphNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
