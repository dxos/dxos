//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';
import { trim } from '@dxos/util';

import { DiscordNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DiscordNamespace.key,
    name: 'Discord',
    author: 'DXOS',
    description: trim`
      Connect a Discord bot to your workspace so server channels stream alongside everything else you're doing.
      Messages from every guild the bot belongs to are pulled incrementally into ECHO as structured Message objects
      inside Channel feeds - fully local-first and replicated to all peers without a central server.

      Setup takes a single bot token from the Discord developer portal. On first use the plugin validates the token
      against the Discord API, stores the bot identity, and lets you pick which channels to follow. Each selected
      channel is materialized as a local ECHO Channel object keyed by its Discord snowflake id so re-syncing is
      idempotent and channels can be referenced from anywhere in the workspace.

      Sync is incremental: after the initial history window (configurable per channel, default 30 days) only messages
      newer than the last seen snowflake are fetched. System noise - joins, pins, calls - is filtered out
      automatically, and Discord reply chains are preserved via Message.threadId so conversations can be reconstructed
      locally without additional API round-trips.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-discord',
    icon: { key: 'ph--discord-logo--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'connector'],
    dependsOn: ['org.dxos.plugin.thread'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // Headless: EDGE posts through the same backend that the app starts the bot with.
    Capability.lazyModule(
      'DiscordChannelBackend',
      {
        provides: [ThreadCapabilities.ChannelBackend],
        activatesOn: ThreadEvents.Start,
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
      () => import('./src/capabilities/channel-backend.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'DiscordConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    // EDGE's bot routes over the client's EDGE HTTP client; EDGE provides the service itself, over a worker binding.
    AppCapability.layerSpec(() => import('./src/capabilities/discord-bot.ts', { with: { type: 'module-url' } }), {
      name: 'DiscordBot',
      environments: ['browser', 'node', 'tauri'],
    }),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: DiscordNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
