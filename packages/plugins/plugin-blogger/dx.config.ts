//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { BloggerNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: BloggerNamespace.key,
    name: 'Blogger',
    author: 'DXOS',
    description: 'Author blog posts with agent assistance.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-blogger',
    icon: { key: 'ph--pen-nib--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.markdown'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'dx-module' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'dx-module' } })),
    AppCapability.navigationResolver(
      () => import('./src/capabilities/navigation-target-resolver.ts', { with: { type: 'dx-module' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'dx-module' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: BloggerNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'dx-module' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'dx-module' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'dx-module' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'dx-module' } })),
  ],
});

export const { meta, make } = config;

export default config;
