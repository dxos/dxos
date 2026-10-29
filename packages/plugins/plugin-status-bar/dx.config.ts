//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';
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
      roles: [DeckRole.StatusBarFooter, DeckRole.StatusBar, DeckRole.VersionInfo],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
