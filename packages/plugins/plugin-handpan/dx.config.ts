//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { HandpanNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: HandpanNamespace.key,
    name: 'Handpan',
    author: 'DXOS',
    description: trim`
      Record handpan music notation in a bar grid and transcribe it from live audio.
      Calibrate the detector to your instrument, then see each note as you play it.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-handpan',
    icon: { key: 'ph--record--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.sequencer'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: HandpanNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
