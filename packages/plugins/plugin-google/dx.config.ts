//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.google',
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
    // Every operation here runs against plugin-inbox's Mailbox type and its mail-sync harness, so this
    // provider is inert on its own.
    dependsOn: ['org.dxos.plugin.inbox'],
    icon: { key: 'ph--google-logo--regular', hue: 'red' },
    tags: ['alpha', 'connector'],
  },
});
