//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { QaNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: QaNamespace.key,
    name: 'QA',
    author: 'DXOS',
    description: trim`
      A store for QA results. A test plan declares a set of cases; every execution appends a run to
      the plan's feed, carrying one result per case together with the documents, screenshots and
      recordings that evidence it.

      Plans are authored and results are pushed over the DXOS MCP surface, so the plan a human
      reads in Composer is the one an agent reports against.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-qa',
    icon: { key: 'ph--check-square-offset--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    // The spec is package data rather than a module, so it is read relative to the package root.
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: QaNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
