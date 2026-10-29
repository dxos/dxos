//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';
import { trim } from '@dxos/util';

import * as FreeqCapabilities from './src/FreeqCapabilities.ts';
import { FreeqNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: FreeqNamespace.key,
    name: 'Freeq',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-freeq',
    spec: 'PLUGIN.mdl',
    description: trim`
      Integrates freeq - an IRCv3 chat service that authenticates users via AT
      Protocol / Bluesky identities - as a live channel backend for the DXOS
      Composer thread plugin. The plugin connects to a freeq server over
      WebSocket, authenticates over the ATPROTO-CHALLENGE SASL mechanism, joins
      an IRC channel, streams inbound messages in real time, and sends outbound
      messages from the Composer composer.

      Messages are transient: live messages are held in memory for the session
      and channel history is backfilled from freeq's read-only REST API on join.
      A single WebSocket is shared across every Composer channel that targets the
      same server and identity.
    `,
    icon: { key: 'ph--dog--regular', hue: 'amber' },
    tags: ['labs', 'connector'],
    dependsOn: ['org.dxos.plugin.thread'],
  },
  modules: [
    // Single module contributes both the connection manager and the channel backend
    // (see channel-backend.ts) - same-wave modules cannot `waitFor` each other's contributions.
    // Contributes both the connection manager and the channel backend (see channel-backend.ts).
    Capability.lazyModule(
      'FreeqChannelBackend',
      {
        provides: [FreeqCapabilities.ConnectionManager, ThreadCapabilities.ChannelBackend],
        activatesOn: ThreadEvents.Start,
      },
      () => import('./src/capabilities/channel-backend.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: FreeqNamespace.key,
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
