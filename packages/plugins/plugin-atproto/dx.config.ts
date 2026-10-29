//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { AtprotoNamespace } from './src/namespace.ts';
import * as AtprotoCapabilities from './src/types/AtprotoCapabilities.ts';
import * as AtprotoEvents from './src/types/AtprotoEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: AtprotoNamespace.key,
    name: 'ATProto',
    author: 'DXOS',
    description: trim`
    A generic publishing companion for the AT Protocol. It appears beside any ECHO object whose type
    carries an atproto record annotation, when the space holds an atproto connection.

    The companion shows the object's public projection - which fields the network will see and which
    stay private - the publish/sync status, and actions to publish, re-publish, and unpublish the
    record on the user's PDS. It is driven entirely by the type annotation, so any content plugin can
    opt in without depending on this plugin.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-atproto',
    icon: { key: 'ph--broadcast--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'AtprotoConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: AtprotoNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    Capability.lazyModule(
      'RepoLayer',
      {
        requires: [ClientCapabilities.Client],
        provides: [AtprotoCapabilities.RepoLayer, AtprotoCapabilities.ReadRepoLayer],
        activatesOn: AtprotoEvents.Start,
      },
      () => import('./src/capabilities/repo-layer.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
