//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.jmap',
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
    // Every operation here runs against plugin-inbox's Mailbox type and its mail-sync harness, so this
    // provider is inert on its own.
    dependsOn: ['org.dxos.plugin.inbox'],
    icon: { key: 'ph--envelope--regular', hue: 'indigo' },
    tags: ['alpha', 'connector'],
  },
});
