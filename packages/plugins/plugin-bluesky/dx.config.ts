//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.bluesky',
    name: 'Bluesky',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-bluesky',
    spec: 'PLUGIN.mdl',
    description: trim`
      Integrates the AT Protocol (atproto) and Bluesky social network into the
      DXOS Composer workspace. Users authenticate via the atproto OAuth flow —
      DPoP-bound tokens are managed by the DXOS Edge proxy so credentials never
      leave the server — and the plugin syncs their posts, liked posts, bookmarks,
      and saved custom feed generators into local Subscription.Feed objects backed
      by ECHO queues.

      Each sync target produces Subscription.Post ECHO objects that live in the
      user's space and replicate to peers like any other local-first data. Sync is
      pull-only and cursor-based: on incremental runs the plugin walks XRPC pages
      from newest backwards and stops when it reaches the last-seen post URI,
      keeping bandwidth low for active users.

      Target discovery lists the three built-in self-targets (my posts, my liked
      posts, my bookmarks) plus one entry per saved feed generator from the user's
      atproto preferences. Per-target page budgets are configurable via
      BlueskyTargetOptions.maxPages and are capped by a hard safety limit to
      prevent runaway pagination on algorithmic feeds.

      Authenticated XRPC calls (likes, bookmarks, saved feeds, custom feed
      generators) are proxied through the DXOS Edge /atproto/proxy endpoint so
      the stored DPoP signing key can attach the required proof headers before
      forwarding to the user's Personal Data Server (PDS). Public reads such as
      the author feed bypass the proxy and call the Bluesky public API directly.
    `,
    icon: { key: 'ph--butterfly--regular', hue: 'sky' },
    tags: ['labs', 'integration'],
  },
});
