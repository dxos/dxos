//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.feed',
    name: 'Feed',
    author: 'DXOS',
    description: trim`
      FeedPlugin brings syndicated content into DXOS Composer by syncing RSS feeds
      and ATproto (Bluesky) feeds as ECHO objects stored in the user's space.
      Subscribed feeds are polled incrementally using a cursor so only new posts
      are fetched on each sync, and feed metadata (name, icon, description) is
      persisted alongside the posts for offline access.

      Magazines are agent-curated collections drawn from one or more feeds. Each
      Magazine carries the user's topic instructions describing what it should
      cover; pressing the Curate button (or a scheduled trigger) syncs all
      referenced feeds in parallel, then runs a single-shot agent pass that selects
      matching posts and returns their ids, which the operation adds mechanically.
      The agent's base methodology — how to select, how to dedup, and the structured
      output contract — lives in the MagazineBlueprint, resolved from the registry
      and combined with the magazine's topic into an ephemeral routine each run; the
      blueprint also exposes a FetchArticleContent tool the agent may call to read a
      candidate's full text when title and description are insufficient to judge.
      A short snippet and hero image are derived mechanically from each post for
      display. A Masonry grid renders the curated tiles with images, titles, author
      metadata, and read-state dimming.

      Clicking a tile opens the PostArticle detail surface via the deck's layout
      dispatch, routing to the appropriate location (complementary drawer, sibling
      plank, or deck companion) based on the current layout mode. The schema also
      scaffolds a future tagging feature — posts carry an optional tags array and
      the tile renders a tag row when tags are present — enabling navigation and
      feed-discovery flows in a later revision.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-feed',
    icon: { key: 'ph--rss--regular', hue: 'orange' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
