//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { GameNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: GameNamespace.key,
    name: 'Game',
    author: 'DXOS',
    description: trim`
      Generic game host plugin that provides shared infrastructure for local-first,
      multi-player turn-based games inside DXOS Composer. The plugin owns the base
      \`Game\` ECHO type — which stores players and a reference to variant-specific
      state — and drives the two-stage game-creation flow (variant picker + optional
      input form).

      Game variants (chess, tic-tac-toe, and others) are contributed by separate
      plugins via the \`GameCapabilities.VariantProvider\` capability. Each variant supplies
      its own state schema, player roles, create factory, and surface components
      (Article and Card). Plugin-game resolves the correct variant at runtime and
      delegates rendering, keeping the host layer fully decoupled from game logic.

      Variant state objects are stored as hidden ECHO objects alongside the top-level
      \`Game\`, ensuring they replicate to all peers but do not appear as independent
      items in the user's space graph. The entire creation flow is atomic: if the
      Game write fails, the variant state is rolled back automatically.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-game',
    icon: { key: 'ph--sword--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      {
        dark: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/2797d56edc9658d018ad75fe48a47f27/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2F2797d56edc9658d018ad75fe48a47f27%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
      },
    ],
    tags: ['alpha'],
  },
  modules: [
    // Browser-only: the entry supplies `CreateGamePanel`, the React form that picks the variant and
    // collects its input.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
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
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
