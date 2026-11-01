//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { AutocueNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: AutocueNamespace.key,
    name: 'Autocue',
    author: 'DXOS',
    description: trim`
      Play autocue demos: recorded walkthroughs of the app with their steps as chapters, the spec they were
      recorded from, and a prompt to record them again. Link a bundle from dx.pub to watch it in a space.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-autocue',
    icon: { key: 'ph--film-strip--regular', hue: 'amber' },
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
