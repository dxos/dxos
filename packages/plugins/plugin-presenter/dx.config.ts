//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { PresenterNamespace } from './src/namespace.ts';
import * as PresenterCapabilities from './src/types/PresenterCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: PresenterNamespace.key,
    name: 'Presenter',
    author: 'DXOS',
    description: trim`
      Build slide decks from the objects in your workspace without duplicating content. A
      Presentation is an ordered list of sections, each a markdown slide written in place or a
      link to any other object, and appears in the navtree as a folder of slides that can be
      reordered by dragging. Objects without a dedicated slide surface still render as a title
      slide.

      Press F, or use the toolbar, to present a deck fullscreen on its own plank. Arrow keys
      step through slides, Escape exits fullscreen, and a pager overlay appears on pointer
      movement. Each viewer keeps their own place in a deck across reloads.

      Any markdown document can also be previewed as a deck from its Presenter companion, split
      into slides on horizontal \`---\` separators, and presented with Shift+Cmd+P (macOS) /
      Shift+Alt+P (Windows/Linux).

      Collaboration is inherent: because slides are backed by live ECHO objects, edits made
      by any peer in the workspace are immediately reflected in an open presentation without
      any manual refresh.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-presenter',
    icon: { key: 'ph--presentation--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['beta'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'MarkdownExtension',
      { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'PresenterMigrations',
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
      pluginId: PresenterNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.slide'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [PresenterCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
