//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as AnimatorEvents from '@dxos/plugin-animator/AnimatorEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { SpacetimeNamespace } from './src/namespace.ts';
import * as SpacetimeCapabilities from './src/types/SpacetimeCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SpacetimeNamespace.key,
    name: 'Spacetime',
    author: 'DXOS',
    description: trim`
    A generative 3D modeling and animation plugin for DXOS Composer.
    Uses Babylon.js for real-time rendering with an ArcRotateCamera, HemisphericLight, and a toggleable ground-plane grid.
    Solid geometry is handled by Manifold (WASM), enabling constructive solid geometry (CSG) operations
    such as boolean union and ordered subtraction directly in the browser.

    Each Spacetime article is backed by a Scene ECHO object that holds an ordered collection of Object Refs.
    Objects store their geometry as either a named primitive (cube, sphere, cylinder, cone, pyramid) or
    serialized mesh data (base64-encoded vertex positions and triangle indices), along with position,
    scale, rotation, and color. All state persists and replicates collaboratively via ECHO.

    Three interactive tools are available: Select (pick objects or coplanar face groups), Move
    (translate along the XZ ground plane or Y axis with optional grid snap), and Extrude
    (push/pull a selected face along its normal using Manifold's warp function with real-time preview).
    The plugin also supports importing GLB/GLTF and OBJ files and exporting selected objects as binary STL.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-spacetime',
    icon: { key: 'ph--cube--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      {
        light: 'https://assets.composer.space/demos/2026-10-16-plugin-spacetime-light.mp4?v=995ae0ca',
        dark: 'https://assets.composer.space/demos/2026-10-16-plugin-spacetime.mp4?v=280c6044',
      },
    ],
    tags: ['labs'],
  },
  modules: [
    // The scene as an animator stage, contributed when the animator starts; browser-only, as it renders with Babylon.
    Capability.lazyModule(
      'animator-stage',
      {
        provides: [AnimatorCapabilities.Stage],
        activatesOn: AnimatorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/animator-stage.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: SpacetimeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [SpacetimeCapabilities.Settings],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
