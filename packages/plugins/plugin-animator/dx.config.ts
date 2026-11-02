//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: 'org.dxos.plugin.animator',
    name: 'Animator',
    author: 'DXOS',
    description: trim`
      Animate objects other plugins own: key their properties on a timeline, script shots declaratively, and play
      them as a film of shots.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-animator',
    icon: { key: 'ph--film-strip--regular', hue: 'violet' },
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: [AppSurface.Article],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
