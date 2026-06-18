//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.discord',
    name: 'Discord',
    author: 'DXOS',
    description: trim`
      Connect a Discord bot to your workspace so server channels stream alongside everything else you're doing.
      Messages from every guild the bot belongs to are pulled incrementally into ECHO as structured Message objects
      inside Channel feeds — fully local-first and replicated to all peers without a central server.

      Setup takes a single bot token from the Discord developer portal. On first use the plugin validates the token
      against the Discord API, stores the bot identity, and lets you pick which channels to follow. Each selected
      channel is materialized as a local ECHO Channel object keyed by its Discord snowflake id so re-syncing is
      idempotent and channels can be referenced from anywhere in the workspace.

      Sync is incremental: after the initial history window (configurable per channel, default 30 days) only messages
      newer than the last seen snowflake are fetched. System noise — joins, pins, calls — is filtered out
      automatically, and Discord reply chains are preserved via Message.threadId so conversations can be reconstructed
      locally without additional API round-trips.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-discord',
    icon: { key: 'ph--discord-logo--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'integration'],
  },
});
