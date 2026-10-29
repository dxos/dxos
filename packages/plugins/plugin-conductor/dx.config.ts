//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { ConductorNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ConductorNamespace.key,
    name: 'Conductor',
    author: 'DXOS',
    description: trim`
      Conductor is a visual node-based compute graph plugin for DXOS Composer.
      It lets you compose reactive data pipelines by connecting typed input and output ports on a
      drag-and-drop infinite canvas - no code required for common automation patterns.

      Each node in the graph is a first-class ECHO object, so the full pipeline topology is
      replicated to every collaborator in real time via the local-first runtime.
      Built-in node types cover constants, templates, boolean logic, control flow, JSON transforms,
      ECHO database access, append-only queues, and conversation threads.

      AI orchestration is a first-class concern: the GPT node connects to plugin-assistant's AiService
      and supports tool calling, streaming replies, and configurable system prompts.
      Function nodes can invoke any Skill operation registered in the space, making it straightforward
      to compose multi-step agent workflows visually and share them across teams.
    `,
    icon: { key: 'ph--infinity--regular', hue: 'sky' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-conductor',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-canvas-dark.png' }],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: ConductorNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
