//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { StatusBarNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StatusBarNamespace.key,
    name: 'Status Bar',
    author: 'DXOS',
    description: trim`
      Persistent bottom bar displaying workspace status information and quick actions.
      Access connection state, notifications, and common commands without leaving your current context.
    `,
    icon: { key: 'ph--info--regular' },
    tags: ['system'],
  },
  modules: [
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.statusBar.role.footer',
        'org.dxos.plugin.statusBar.role.statusBar',
        'org.dxos.plugin.statusBar.role.versionInfo',
      ],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
