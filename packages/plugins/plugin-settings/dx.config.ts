//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SettingsNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SettingsNamespace.key,
    name: 'Settings',
    author: 'DXOS',
    tags: ['system'],
  },
  modules: [
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        name: 'SettingsAppGraphBuilder',
      },
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
