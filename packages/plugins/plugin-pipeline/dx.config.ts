//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { PipelineNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: PipelineNamespace.key,
    name: 'Pipelines',
    author: 'DXOS',
    description: trim`
      A multi-column Kanban-style pipeline plugin for DXOS Composer.
      Each Pipeline holds an ordered set of Columns; each Column is backed by a ViewModel whose query
      can select any ECHO object type — messages, contacts, documents, or custom types — from the active space.

      Columns are fully configurable through the Settings companion panel, where users can add, rename,
      reorder, and delete columns and edit the underlying query and projection for each column.
      Objects can be dragged between columns and the full pipeline state, including column order and
      per-column item order, persists collaboratively via ECHO.

      A built-in Research template scaffolds a four-column pipeline wired to the Mailbox, Contacts,
      Organizations, and Notes objects in the space, providing an out-of-the-box CRM-style workflow.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-pipeline',
    icon: { key: 'ph--path--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.pluginAsset({
      pluginId: PipelineNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
