//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { MapNamespace } from './src/namespace.ts';
import * as MapCapabilities from './src/types/MapCapabilities.ts';
import * as MapEvents from './src/types/MapEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MapNamespace.key,
    name: 'Maps',
    author: 'DXOS',
    description: trim`
      Interactive geospatial mapping plugin that renders ECHO dataset records as map pins or globe markers.
      Connect any table schema that contains latitude/longitude coordinates to a named Map object,
      and the plugin automatically queries the linked dataset and projects each row as a geographic marker.

      The map viewport supports two rendering modes — a standard tile-based 2-D map and an interactive 3-D globe —
      switchable at any time via the toggle operation.
      Each mode preserves the current center and zoom level so context is not lost when switching views.

      Maps are collaborative ECHO objects: all peers sharing a space see viewport changes and dataset updates
      in real time without any manual refresh.
      A Skill is also included so AI assistants can create and update maps on behalf of the user.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map',
    icon: { key: 'ph--compass--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-map-dark.png' }],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [MapCapabilities.MarkerProvider],
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
      activatesOn: ActivationEvents.Idle,
      provides: [MapCapabilities.Settings],
    }),
    Capability.lazyModule(
      'MapState',
      { provides: [MapCapabilities.State], activatesOn: MapEvents.Start },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: a `MarkerProvider` contributes a `useMarkers` React hook, and this one calls
    // `useMemo`/`useQuery`/`useObject` in its own body.
    Capability.lazyModule(
      'MarkerProvider',
      { provides: [MapCapabilities.MarkerProvider], activatesOn: MapEvents.Start, environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/marker-provider.tsx', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri', 'workerd'], activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.pluginAsset({
      pluginId: MapNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.map.role.map',
        'org.dxos.plugin.map.role.world',
        'org.dxos.role.article',
        'org.dxos.role.formInput',
        'org.dxos.role.objectProperties',
        'org.dxos.role.section',
      ],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
