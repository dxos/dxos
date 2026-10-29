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

import { JmapNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: JmapNamespace.key,
    name: 'JMAP',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-jmap',
    description: trim`
      Syncs mail from any JMAP server (RFC 8620/8621) into a local-first Mailbox. Fastmail is the
      canonical provider; the session is discovered at the well-known JMAP endpoint on the host you
      supply.

      Headless: this plugin contributes the JMAP connector, its credential form, and the sync, send
      and materialize operations. The mailbox itself, its UI, and the provider-agnostic sync harness
      belong to the Inbox plugin, which this one depends on.

      Credentials are a host, an account email, and a Bearer API token, validated against the live
      session when the form is submitted — no OAuth. Sync is incremental: after the first run the
      server's state string drives a bounded delta per run, and folder and keyword changes reconcile
      against messages already in the feed.
    `,
    dependsOn: ['org.dxos.plugin.inbox'],
    icon: { key: 'ph--envelope-simple-open--regular', hue: 'green' },
    tags: ['alpha', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'JmapConnector',
      {
        environments: ['browser', 'node', 'tauri', 'workerd'],
        provides: [ConnectorSpec.Connector],
        activatesOn: ConnectorEvents.Start,
      },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'JmapMailSend',
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
