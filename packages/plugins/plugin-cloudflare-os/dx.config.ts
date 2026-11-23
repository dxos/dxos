//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { CloudflareOsNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CloudflareOsNamespace.key,
    name: 'Cloudflare OS',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-cloudflare-os',
    spec: 'PLUGIN.mdl',
    description: trim`
      Use a Cloudflare OS deployment as a backend for a space.

      Connect a Cloudflare OS account, then bind one of its workspaces to the space (or create one).
      The workspace's gadgets open as an article, running in the same sandbox Cloudflare OS gives them,
      and the workspace's agent joins Composer's agent picker beside Composer's own agent and Claude
      Code. Changes the agent proposes, and actions it queues behind a gatekeeper, are approved from
      the chat.
    `,
    icon: { key: 'ph--cloud--regular', hue: 'orange' },
    tags: ['labs', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'CloudflareOsConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'CloudflareOsAgent',
      {
        environments: ['browser', 'tauri'],
        provides: [AssistantCapabilities.Agent],
        activatesOn: AppActivationEvents.AssistantStart,
      },
      () => import('./src/capabilities/agent.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: CloudflareOsNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppSurface.Article],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
