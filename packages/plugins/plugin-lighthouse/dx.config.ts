//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { LighthouseNamespace } from './src/namespace.ts';
import * as LighthouseCapabilities from './src/types/LighthouseCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LighthouseNamespace.key,
    name: 'Lighthouse',
    author: 'DXOS',
    description: trim`
      Agent-driven web research. A Research hands a goal to a lighthouse search session, streams its thread
      beside a ranked masonry of what it found, and keeps the picks and starred results in the space.
    `,
    icon: { key: 'ph--binoculars--regular', hue: 'amber' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lighthouse',
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'connector'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [AttentionCapabilities.Attention],
      },
    ),
    Capability.lazyModule(
      'ClientFactory',
      { provides: [LighthouseCapabilities.ClientFactory] },
      () => import('./src/capabilities/client-factory.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'LighthouseConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: LighthouseNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
