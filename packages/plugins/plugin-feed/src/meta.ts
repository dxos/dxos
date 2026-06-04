//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.feed'),
  name: 'Feed',
  author: 'DXOS',
  description: trim`
    FeedPlugin brings syndicated content into DXOS Composer by syncing RSS feeds
    and ATproto (Bluesky) feeds as ECHO objects stored in the user's space.
    Subscribed feeds are polled incrementally using a cursor so only new posts
    are fetched on each sync, and feed metadata (name, icon, description) is
    persisted alongside the posts for offline access.

    Magazines are agent-curated collections drawn from one or more feeds. The
    user writes a natural-language brief describing what the Magazine should
    gather; pressing the Curate button triggers a deterministic sync of all
    referenced feeds followed by a curation pass that derives a short snippet
    and hero image from each post's description and appends matching posts to
    the collection. A Masonry grid renders the curated tiles with images, titles,
    author metadata, and read-state dimming.

    A parallel agent path lets a conversational assistant curate a Magazine with
    higher fidelity. The MagazineBlueprint exposes three fine-grained tools —
    ListCandidatePosts, FetchArticleContent, and AddPostToMagazine — that the
    agent calls in sequence, reading the full article body and selecting the best
    hero image before committing a post to the collection. The deterministic
    button path and the agent path coexist: the button gives an immediate result
    without requiring an LLM, while the agent path delivers instruction-driven
    selection when a chat session is active.

    Clicking a tile opens the PostArticle detail surface via the deck's layout
    dispatch, routing to the appropriate location (complementary drawer, sibling
    plank, or deck companion) based on the current layout mode. The schema also
    scaffolds a future tagging feature — posts carry an optional tags array and
    the tile renders a tag row when tags are present — enabling navigation and
    feed-discovery flows in a later revision.
  `,
  icon: 'ph--rss--regular',
  iconHue: 'orange',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-feed',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
