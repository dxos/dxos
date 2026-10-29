//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { LingoNamespace } from './src/namespace.ts';
import * as LingoCapabilities from './src/types/LingoCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LingoNamespace.key,
    name: 'Lingo',
    author: 'DXOS',
    description: trim`
      Build vocabulary in the languages you are studying.
      Collect words into decks, drill them with flashcards, harvest new terms from any document,
      and read documents or email with inline translations revealed on hover.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lingo',
    icon: { key: 'ph--translate--regular', hue: 'teal' },
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.markdown'],
  },
  modules: [
    AppCapability.pluginAsset({
      pluginId: LingoNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [LingoCapabilities.Settings],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
