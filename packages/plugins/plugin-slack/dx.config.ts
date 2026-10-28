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

import { SlackNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SlackNamespace.key,
    name: 'Slack',
    author: 'DXOS',
    description: trim`
      SlackPlugin connects a Slack workspace to DXOS Composer via OAuth so that
      channels and messages appear alongside documents, threads, and other
      collaborative objects in your space.

      After authorising with a Slack OAuth token the plugin discovers all public
      and private channels the token can access and presents them as selectable
      sync targets. No local objects are created until you choose which channels
      to track, keeping your space uncluttered.

      Selected channels are synced incrementally: on each run the plugin fetches
      only messages newer than the last cursor, maps them to standard
      \`@dxos/types\` Message objects (preserving thread relationships via
      \`threadId\`), and appends them to a per-channel ECHO feed. User and bot
      display names are resolved lazily via the Slack Web API and cached for the
      duration of each sync pass.

      Credentials are stored as an OAuth AccessToken in ECHO and accessed through
      an Effect Context service so they are never threaded through call sites.
      All Slack API calls use POST with \`application/x-www-form-urlencoded\`
      bodies to satisfy Slack's CORS constraints, and include automatic retry with
      exponential back-off for transient failures.

      Each synced conversation is a Slack-backed Channel, so agents can converse
      through it: they post as the connection's bot, reply in threads, and open
      direct messages with people whose Slack id is on their contact card.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-slack',
    spec: 'PLUGIN.mdl',
    icon: { key: 'ph--slack-logo--regular', hue: 'purple' },
    tags: ['labs', 'connector'],
    dependsOn: ['org.dxos.plugin.thread'],
  },
  modules: [
    // Headless: an agent on EDGE posts through the same backend as the app.
    Capability.lazyModule(
      'SlackChannelBackend',
      {
        provides: [ThreadCapabilities.ChannelBackend],
        activatesOn: ThreadEvents.Start,
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
      () => import('./src/capabilities/channel-backend.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'SlackConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: SlackNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
