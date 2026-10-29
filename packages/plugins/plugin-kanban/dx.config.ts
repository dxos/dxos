//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { KanbanNamespace } from './src/namespace.ts';
import * as KanbanEvents from './src/types/KanbanEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: KanbanNamespace.key,
    name: 'Kanban',
    author: 'DXOS',
    description: trim`
      Visual project management using customizable kanban boards to track workflow progress.
      Organize any ECHO type into drag-and-drop columns defined by a single-select field, move cards
      between stages, and reorder both columns and cards — all changes are persisted to ECHO and
      replicated to collaborators in real time.

      Kanban boards come in two variants: view-variant boards source their cards through a linked
      View query (any ECHO type can be pivoted on a single-select field), while items-variant boards
      own their cards explicitly and are used by external sync integrations such as Linear or GitHub.
      Both variants share the same arrangement storage and drag-and-drop mechanics.

      Board settings let users choose which single-select field drives the column layout and
      optionally hide the uncategorized column for items that have no pivot value.
      Field-level undo support allows deleted card fields to be restored without data loss.

      The plugin contributes a Kanban skill that exposes board creation and card management
      to AI agents, enabling automated project tracking workflows.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-kanban',
    icon: { key: 'ph--kanban--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-kanban-dark.png' }],
    tags: ['beta'],
  },
  modules: [
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
      pluginId: KanbanNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.CardContent, AppRole.FormInput, AppRole.ObjectProperties, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } }), {
      activatesOn: KanbanEvents.Start,
      environments: ['browser', 'node', 'tauri'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
