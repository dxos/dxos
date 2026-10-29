//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';
import { trim } from '@dxos/util';

import { TableNamespace } from './src/namespace.ts';
import * as TableEvents from './src/types/TableEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TableNamespace.key,
    name: 'Tables',
    author: 'DXOS',
    description: trim`
      Tables brings structured, spreadsheet-style data views to DXOS Composer.
      Any ECHO schema type can be bound to a Table, giving users a familiar grid interface
      for browsing, creating, and editing objects stored in a local-first collaborative space.

      Columns are derived automatically from the schema's fields and persisted in a View object
      alongside the table. Rows can be inserted inline, sorted by column, filtered by tag or
      global search, and deleted with multi-row selection - all changes are replicated in
      real-time across peers via ECHO.

      The plugin integrates deeply with the Composer lifecycle: a default Task table is created
      when a new space is initialised, and a table is automatically opened whenever a new schema
      type is added to a space. An AI skill lets agents create and populate tables
      programmatically using the plugin's operation set.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table',
    icon: { key: 'ph--table--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://media.dxos.network/plugin-details-tables-dark.png' },
      { dark: 'https://assets.composer.space/demos/2026-10-09-plugin-table.mp4?v=7bd261d8' },
    ],
    tags: ['beta'],
  },
  modules: [
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: TableEvents.Start,
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    // Genuine runtime event: fires whenever a new type is added to a space, not at startup.
    Capability.lazyModule(
      'on-type-added',
      { provides: [SpaceCapabilities.OnTypeAdded], activatesOn: SpaceEvents.TypeAdded },
      () => import('./src/capabilities/on-type-added.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: TableNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.translations(() => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
