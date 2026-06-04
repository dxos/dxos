//
// Copyright 2026 DXOS.org
//

/** `IntegrationProvider.id` for the Bluesky integration. */
export const BLUESKY_PROVIDER_ID = 'bluesky';

/** `AccessToken.source` and `Obj.Meta.keys[i].source` for Bluesky. */
export const BLUESKY_SOURCE = 'bsky.app';

/**
 * `IntegrationProvider.id` for the Atmosphere integration: the same atproto OAuth flow as Bluesky
 * but without any sync targets. Its Integrations are also created by the OAuth account-recovery
 * flow, which routes `providerId` here.
 */
export const ATMOSPHERE_PROVIDER_ID = 'atmosphere';

/**
 * `AccessToken.source` for the Atmosphere integration. atproto accounts are portable — the PDS and
 * handle can change — so we don't pin to a hostname.
 */
export const ATMOSPHERE_SOURCE = 'atproto.local';

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
 * Hard ceiling on pages walked per target per sync, regardless of
 * `target.options.maxPages`. Self-targets generally hit `target.cursor`
 * well before this on incremental syncs and stop early; this just bounds
 * the cold-start case so we don't drain the user's entire history in one
 * pass.
 */
export const MAX_PAGES_HARD_CAP = 20;

/**
 * Default `maxPages` per target type when `target.options.maxPages` is unset.
 * Self-targets (posts / likes / bookmarks) are chronological so cursor-stopping
 * is reliable — let them walk a few pages on cold start. Custom feed
 * generators are algorithmic and could page indefinitely; default to one
 * page per sync and let users opt into more.
 */
export const DEFAULT_MAX_PAGES = {
  SELF: 5,
  FEED: 1,
} as const;
