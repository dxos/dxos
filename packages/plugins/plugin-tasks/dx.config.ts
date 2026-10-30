//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { TasksNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TasksNamespace.key,
    name: 'Tasks',
    author: 'DXOS',
    description: trim`
      Owner of the task surface: markdown outlines (the fluid form of work) and durable Task
      objects in TaskSets (the assignable form), linked by convert-to-task promotion.
      Tree-structured note-taking editor for organizing ideas hierarchically.
      Each Outline is backed by an ECHO CRDT Text object so edits merge automatically across peers in real time.
      Indent and outdent list items with Tab / Shift-Tab, use hashtags for inline tagging, and delete items via the editor context menu.

      The plugin also provides a Journal — a date-keyed collection of entries where each day's notes are an independent outline.
      A collapsible calendar sidebar lets you navigate between dates, and the journal auto-creates today's entry on first focus.
      Entries render newest-first in a scrollable list so recent notes are always at hand.

      A Quick Journal Entry dialog (accessible as a global operation) lets you append a checkbox bullet to today's entry without leaving your current context.
      Invoking the operation from an AI skill or keyboard shortcut creates the Journal and today's entry automatically if they do not yet exist.
    `,
    icon: { key: 'ph--tree-structure--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tasks',
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
  modules: [
    // Narrower than the `appGraphBuilder` family default: its nodes invoke
    // `LayoutOperation.UpdateDialog`, which means nothing without an app shell.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'TasksMigrations',
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
      pluginId: TasksNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.CardContent, AppRole.Dialog, AppRole.Related, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
