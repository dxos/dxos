//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as BloggerCapabilities from '@dxos/plugin-blogger/BloggerCapabilities';
import * as BloggerEvents from '@dxos/plugin-blogger/BloggerEvents';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { TypefullyNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TypefullyNamespace.key,
    name: 'Typefully',
    author: 'DXOS',
    description: trim`
      Publish blog post drafts to Typefully. It implements the plugin-blogger PublisherService
      capability, authenticating via a plugin-connector Connection, so drafts authored in
      Composer can be created and listed on Typefully.
    `,
    icon: { key: 'ph--feather--regular', hue: 'sky' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-typefully',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.blogger'],
  },
  modules: [
    Capability.lazyModule(
      'TypefullyConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: TypefullyNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    Capability.lazyModule(
      'TypefullyPublisherService',
      { provides: [BloggerCapabilities.PublisherService], activatesOn: BloggerEvents.Start },
      () => import('./src/capabilities/publisher-service.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
