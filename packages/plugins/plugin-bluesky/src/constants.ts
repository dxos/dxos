//
// Copyright 2026 DXOS.org
//

/** `IntegrationProvider.id` for the Bluesky integration. */
export const BLUESKY_PROVIDER_ID = 'bluesky';

/** `AccessToken.source` and `Obj.Meta.keys[i].source` for Bluesky. */
export const BLUESKY_SOURCE = 'bsky.app';

/** Public read-only XRPC base — works for any public actor / public feed. */
export const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';

/**
 * Stable target ids exposed by `GetBlueskyTargets`. The remote-id must be a
 * stable string the user could re-select; per-feed targets carry the at://
 * uri verbatim.
 */
export const BLUESKY_TARGET = {
  /** Author feed for the authenticated user. */
  MY_POSTS: 'self:posts',
  /** `app.bsky.feed.getActorLikes` for the authenticated user. */
  MY_LIKES: 'self:likes',
  /** `app.bsky.feed.getBookmarks` for the authenticated user. */
  MY_BOOKMARKS: 'self:bookmarks',
  /** Prefix for `feed:<at-uri>` per saved-feed targets. */
  FEED_PREFIX: 'feed:',
} as const;

/** Default page size for XRPC feed queries. */
export const DEFAULT_FEED_LIMIT = 50;

/**
 * Upper bound on pages walked per target per sync.
 * On first sync (no `target.cursor`) we'd otherwise drain the user's
 * entire history, which is wasteful and fragile for large accounts —
 * cap at this many pages and let subsequent syncs catch up incrementally.
 */
export const MAX_PAGES_PER_SYNC = 5;
