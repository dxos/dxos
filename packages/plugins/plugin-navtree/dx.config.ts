//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
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
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'dx-module' } }),
    ),
    // Listens on `document` for right-clicks on elements that name a graph node.
    AppCapability.reactRoot(() => import('./src/capabilities/context-menu.tsx', { with: { type: 'dx-module' } })),
    Capability.inlineModule(
      'expose',
      { requires: [AppCapabilities.AppGraph, AppCapabilities.Layout, Capabilities.OperationInvoker], provides: [] },
      Effect.fnUntraced(function* () {
        const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
        const { invokePromise } = yield* Capabilities.OperationInvoker;
        const { graph } = yield* AppCapabilities.AppGraph;
        if (invokePromise && layout.active.length === 1) {
          // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
          //   That is the point at which the graph is expanded and the path should be available.
          void AppGraph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
            .then(() => invokePromise(LayoutOperation.Expose, { subject: layout.active[0] }))
            .catch(() => {});
        }

        return [];
      }),
    ),
    Capability.lazyModule(
      'Keyboard',
      // Listens on `document`, which node and workerd lack.
      {
        requires: [AppCapabilities.AppGraph, Capabilities.OperationInvoker],
        provides: [],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/keyboard.ts', { with: { type: 'dx-module' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'dx-module' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: NavTreeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'dx-module' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'dx-module' } }), {
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
      () => import('./src/capabilities/state.ts', { with: { type: 'dx-module' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'dx-module' } })),
  ],
});

export const { meta, make } = config;

export default config;
