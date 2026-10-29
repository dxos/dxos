//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { trim } from '@dxos/util';

import { NavTreeNamespace } from './src/namespace.ts';
import * as NavTreeCapabilities from './src/types/NavTreeCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: NavTreeNamespace.key,
    name: 'Navtree',
    author: 'DXOS',
    description: trim`
      NavTreePlugin renders the application graph as a collapsible hierarchical tree in the Composer sidebar.
      It manages workspace tabs at the root level and provides expand/collapse navigation for spaces, folders,
      and objects, with open/current state persisted to localStorage across sessions.

      The plugin wires drag-and-drop rearrangement and cross-parent transfer of tree items via Pragmatic DnD,
      and registers graph-action keyboard shortcuts (including the ⌘K / Ctrl+K command palette) through a
      global Keyboard singleton that tracks context as the user navigates.

      An operation handler for LayoutOperation.Expose expands ancestor paths on demand so that any
      programmatically activated item is scrolled into view in the tree.

      A commands dialog surfaces all discoverable graph actions as a searchable palette, making it the primary
      keyboard-first entry point for power users.
    `,
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // Listens on `document` for right-clicks on elements that name a graph node.
    AppCapability.reactRoot(() => import('./src/capabilities/context-menu.tsx', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'expose',
      { requires: [AppCapabilities.AppGraph, AppCapabilities.Layout, Capabilities.OperationInvoker], provides: [] },
      () => import('./src/capabilities/expose.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Keyboard',
      // Listens on `document`, which node and workerd lack.
      {
        requires: [AppCapabilities.AppGraph, Capabilities.OperationInvoker],
        provides: [],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/keyboard.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: NavTreeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.role.dialog',
        'org.dxos.role.documentTitle',
        'org.dxos.role.navigation',
        'org.dxos.role.searchInput',
      ],
    }),
    Capability.lazyModule(
      'State',
      {
        // ViewState is the persistence backend for per-path expansion.
        requires: [Capabilities.AtomRegistry, AppCapabilities.Layout, AttentionCapabilities.ViewState],
        provides: [NavTreeCapabilities.State],
      },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
