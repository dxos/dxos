//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import { trim } from '@dxos/util';

import { SearchNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.

const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SearchNamespace.key,
    name: 'Search',
    author: 'DXOS',
    description: trim`
      Full-text search over the active space in DXOS Composer. The plugin provides a global
      command-palette style dialog (invoked via the OpenSearch operation) that debounces user input
      and matches it against the space's FTS5 index, returning ranked, highlighted results with
      field-level match context.

      A persistent SearchArticle panel can be pinned in the deck companion sidebar so the query stays
      visible while navigating documents. Both surfaces share a SearchContextProvider that drives the
      GlobalFilterProvider, allowing any view that uses useGlobalFilteredObjects to automatically show
      only the objects matching the current query.

      The mailbox also uses the same full-text index to filter messages by the current search query.

      All search operations are registered through the standard DXOS operations system and can be
      wired into keyboard shortcuts, command palettes, and AI assistants via the OperationHandlerSet.
    `,
    icon: { key: 'ph--magnifying-glass--regular', hue: 'rose' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-qa-flows/plugin-search-QA-1.webm' },
    ],
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    // Gated on demand since nothing reads a spec at boot.
    Capability.lazyModule(
      'plugin-asset',
      {
        activatesOn: ActivationEvents.PluginAssetsRequested,
        provides: [AppCapabilities.PluginAsset],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.deckCompanion('search'), AppRole.Dialog, AppRole.SearchInput],
    }),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
