//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { ExplorerNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ExplorerNamespace.key,
    name: 'Explorer',
    author: 'DXOS',
    description: trim`
    Explorer is an interactive hypergraph visualization plugin that reveals the relationships
    between objects stored in your DXOS workspace. Each Graph document is backed by a live
    ECHO query and a View that you configure - Explorer keeps the visualization synchronized
    with the database in real time so every peer immediately sees changes made by collaborators.

    The plugin offers four switchable layout algorithms for the same data set: a physics-based
    force-directed graph for freeform exploration, a radial cluster layout that groups objects
    by type around a central root, an edge-bundling layout that tames visual clutter on dense
    graphs, and a lattice grid that arranges objects in a sorted matrix sorted by type and label.
    Switching between layouts smoothly tweens node positions so spatial context is preserved.

    Nodes are coloured by their ECHO object type, and hovering any node opens an anchor-card
    preview panel with the object's details without leaving the graph view.
    The toolbar's query editor lets you filter the visible node set on the fly using
    the same query syntax available across Composer.

    A new Graph document can be created from the object-creation dialog; Explorer automatically
    derives an initial View from the chosen type and persists both to ECHO so the graph is
    immediately shareable and replicable across the space.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
    icon: { key: 'ph--graph--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-explorer-dark.png' }],
    tags: ['alpha'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
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
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
