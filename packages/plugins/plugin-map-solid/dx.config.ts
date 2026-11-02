//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { MapNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MapNamespace.key,
    name: 'Maps (Solid)',
    author: 'DXOS',
    description: trim`
      SolidJS-native map surface plugin that renders ECHO Map objects as interactive tile maps or 3-D globes.
      Implements the map surface as a SolidJS Web Component (dx-map-surface), providing fine-grained reactivity
      for high-frequency geospatial updates without the overhead of a React reconciler.

      The component derives geographic markers reactively from the Map's linked View: as rows are added or
      updated in the underlying ECHO dataset, pins appear or move on the map without a full remount.
      Two rendering modes are available — a standard 2-D tile map and an interactive 3-D globe —
      toggled locally per surface instance.

      The custom element uses noShadowDOM so host Tailwind utility classes apply inside the component,
      ensuring consistent styling with the rest of the Composer shell.
      This plugin is designed to complement plugin-map, which owns the Map ECHO schema and object-creation flow.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map-solid',
    icon: { key: 'ph--compass--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-map-dark.png' }],
  },
  modules: [
    AppCapability.pluginAsset({
      pluginId: MapNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
