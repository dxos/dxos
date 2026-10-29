//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { BoardNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: BoardNamespace.key,
    name: 'Board',
    author: 'DXOS',
    description: trim`
    Board is an infinite spatial canvas that lets you place any ECHO object — documents, tasks, notes, or rich media — anywhere on a two-dimensional grid.
    Items are arranged by dragging, resized freely, and removed from the canvas without deleting the underlying data, so the same object can appear on multiple boards simultaneously.

    Each board is itself an ECHO object, making it fully collaborative and conflict-free: all participants see live updates as peers add, move, or remove items in real time.
    The canvas scales to any resolution, supports nested surfaces through the Composer slot system, and integrates naturally with other plugins via the shared ObjectPicker.

    Board is designed as a lightweight composition layer: it imposes no schema on the objects it hosts and delegates rendering to each object's own Card surface, so every plugin contributes its own card representation automatically.
    This makes it ideal for dashboards, mood boards, project overviews, or any context where spatial relationships between heterogeneous objects carry meaning.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-board',
    icon: { key: 'ph--squares-four--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: BoardNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
