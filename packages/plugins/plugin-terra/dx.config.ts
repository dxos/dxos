//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { TerraNamespace } from './src/namespace.ts';
import * as TerraCapabilities from './src/types/TerraCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TerraNamespace.key,
    name: 'Terra',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-terra',
    spec: 'PLUGIN.mdl',
    description: trim`
      A deterministic 3D planet plugin for DXOS Composer, rendering seed-driven stylized worlds
      with Babylon.js. Each planet is generated procedurally from a seed and its configuration, so
      the same seed and configuration always yield the same land, water, and biome layout, while
      live parameters let users reshape the terrain in real-time.
    `,
    icon: { key: 'ph--globe-hemisphere-west--regular', hue: 'green' },
    screenshots: [
      { light: 'https://assets.composer.space/demos/2026-10-16-plugin-terra.mp4?v=6687a7c1' },
      {
        light: 'https://assets.composer.space/demos/2026-10-16-plugin-terra-views-light.mp4?v=8bf5dc36',
        dark: 'https://assets.composer.space/demos/2026-10-16-plugin-terra-views.mp4?v=e8bbc5da',
      },
    ],
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'PlanetCache',
      { provides: [TerraCapabilities.PlanetCache] },
      () => import('./src/capabilities/planet-cache.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: TerraNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
