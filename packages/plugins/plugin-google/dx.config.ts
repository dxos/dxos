//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import { trim } from '@dxos/util';

import { GoogleNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: GoogleNamespace.key,
    name: 'Google',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-google',
    description: trim`
      Connects a Google account and syncs Gmail messages, Calendar events, and Contact groups into the
      workspace as local-first objects. One OAuth grant covers all three; each is a separate connector,
      so a mailbox, a calendar, and a contact group can be bound independently.

      Headless: this plugin contributes the three connectors and the sync, send, materialize and
      discovery operations. The Mailbox and Calendar types, every UI surface, and the provider-agnostic
      mail-sync harness these handlers run against belong to the Inbox plugin, which this one depends on.

      Sync is incremental. Gmail uses history ids to fetch only what changed and reconciles label
      changes against messages already in the feed; Calendar switches from start-time ordering on the
      first run to an updated-since window after that. Gmail's own labels become read-only tags, while
      its system labels map onto DXOS's canonical ones so a Gmail star and a local star are one tag.
    `,
    dependsOn: ['org.dxos.plugin.inbox'],
    icon: { key: 'ph--google-logo--regular', hue: 'green' },
    tags: ['alpha', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'GoogleConnector',
      {
        environments: ['browser', 'node', 'tauri', 'workerd'],
        provides: [ConnectorSpec.Connector],
        activatesOn: ConnectorEvents.Start,
      },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'GoogleMailSend',
      // Read by the inbox compose/reply views and by the assistant's send skill.
      {
        environments: ['browser', 'node', 'tauri', 'workerd'],
        provides: [InboxCapabilities.MailSendOperation],
        activatesOn: ActivationEvent.oneOf(InboxEvents.Start, AppActivationEvents.AssistantStart),
      },
      () => import('./src/capabilities/mail-send.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri', 'workerd'], activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
