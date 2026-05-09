//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Client } from '@dxos/client';

import { BSKY_AUTH_API, BSKY_PUBLIC_API, DEFAULT_FEED_LIMIT } from '../constants';

/**
 * Subset of the `app.bsky.feed.defs#feedViewPost` shape we read.
 * The XRPC response carries much richer data — keep the surface here
 * narrow so the call sites are obvious about what they actually need.
 */
export type FeedViewPost = {
  post: {
    uri: string;
    cid: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    record: { text?: string; createdAt: string };
    indexedAt: string;
  };
  reason?: { $type?: string };
};

/** Response shape of `app.bsky.feed.getAuthorFeed` / `getActorLikes` / `getFeed`. */
export type GetFeedResponse = {
  feed: FeedViewPost[];
  cursor?: string;
};

/** Saved/pinned feed entry from `app.bsky.actor.getPreferences`. */
export type SavedFeed = {
  /** at-uri of the feed generator. */
  value: string;
  /** `feed` for custom feeds, `list` for list-backed feeds, `timeline` for the home timeline. */
  type: 'feed' | 'list' | 'timeline';
  pinned?: boolean;
};

/**
 * Map a feed-view post into the lightweight shape `Subscription.makePost`
 * accepts. Bluesky-specific fields (uri, did, handle) are folded into
 * fields the existing Post schema already has.
 */
export const toSubscriptionPostInput = (item: FeedViewPost) => {
  const text = item.post.record.text ?? '';
  const handle = item.post.author.handle;
  const link = `https://bsky.app/profile/${handle}/post/${item.post.uri.split('/').pop()}`;
  return {
    title: text.slice(0, 100),
    link,
    description: text,
    author: item.post.author.displayName ?? handle,
    published: item.post.record.createdAt,
    /** `at://did:plc:.../app.bsky.feed.post/<rkey>` — stable across renames. */
    guid: item.post.uri,
  };
};

/**
 * Resolve the Edge base URL from the Client's runtime config. Throws if
 * Edge isn't configured (the caller is in an integration flow that requires
 * Edge for OAuth, so this would be a misconfiguration, not a user error).
 */
const resolveEdgeBaseUrl = (client: Client): string => {
  const url = client.config.values.runtime?.services?.edge?.url;
  if (!url) {
    throw new Error('EDGE services not configured.');
  }
  return url;
};

/** Public XRPC GET — used for any read-only endpoint that doesn't need auth. */
const publicGet = async <T>(path: string, query: Record<string, string | number | undefined>): Promise<T> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const url = `${BSKY_PUBLIC_API}/${path}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bluesky public XRPC failed (${response.status}): ${path}`);
  }
  return (await response.json()) as T;
};

/**
 * Authenticated XRPC GET — proxied through Edge `/atproto/proxy` so the
 * stored DPoP key signs the request. The proxy expects the absolute
 * endpoint URL; we point it at the user's PDS (`bsky.social/xrpc`) since
 * that's where the auth context was minted.
 *
 * TODO(plugin-bluesky): Resolve the user's PDS (`atproto.endpoint`) instead
 * of hard-coding bsky.social once non-bsky.social PDSes need to be supported.
 */
const authedGet = async <T>(input: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
  path: string;
  query: Record<string, string | number | undefined>;
}): Promise<T> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input.query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const endpoint = `${BSKY_AUTH_API}/${input.path}?${params.toString()}`;
  const proxyUrl = new URL('/atproto/proxy', resolveEdgeBaseUrl(input.client));
  const response = await fetch(proxyUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spaceId: input.spaceId,
      accessTokenId: input.accessTokenId,
      request: {
        endpoint,
        method: 'GET',
        headers: { Accept: 'application/json' },
        body: null,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Bluesky proxy XRPC failed (${response.status}): ${input.path}`);
  }
  return (await response.json()) as T;
};

/**
 * Fetch an actor's author feed (their own posts + reposts) via the public XRPC.
 * Public reads work without auth, so this never goes through Edge.
 */
export const getAuthorFeed = (input: { actor: string; limit?: number; cursor?: string }): Promise<GetFeedResponse> =>
  publicGet<GetFeedResponse>('app.bsky.feed.getAuthorFeed', {
    actor: input.actor,
    limit: input.limit ?? DEFAULT_FEED_LIMIT,
    cursor: input.cursor,
  });

/**
 * Fetch an actor's liked posts. Requires auth — proxied through Edge so the
 * stored DPoP key signs the request.
 */
export const getActorLikes = (input: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
  actor: string;
  limit?: number;
  cursor?: string;
}): Promise<GetFeedResponse> =>
  authedGet<GetFeedResponse>({
    client: input.client,
    spaceId: input.spaceId,
    accessTokenId: input.accessTokenId,
    path: 'app.bsky.feed.getActorLikes',
    query: { actor: input.actor, limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
  });

/**
 * Fetch the actor's bookmarked posts.
 *
 * TODO(plugin-bluesky): the bookmarks lexicon is still in flux — verify the
 * exact path (`app.bsky.bookmark.getBookmarks` vs. `app.bsky.feed.getBookmarks`)
 * against the deployed bsky lexicon set when wiring this up for real.
 */
export const getBookmarks = (input: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
  limit?: number;
  cursor?: string;
}): Promise<GetFeedResponse> =>
  authedGet<GetFeedResponse>({
    client: input.client,
    spaceId: input.spaceId,
    accessTokenId: input.accessTokenId,
    path: 'app.bsky.bookmark.getBookmarks',
    query: { limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
  });

/** Fetch posts from a custom feed generator (`feed` is the at-uri). */
export const getFeed = (input: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
  feed: string;
  limit?: number;
  cursor?: string;
}): Promise<GetFeedResponse> =>
  authedGet<GetFeedResponse>({
    client: input.client,
    spaceId: input.spaceId,
    accessTokenId: input.accessTokenId,
    path: 'app.bsky.feed.getFeed',
    query: { feed: input.feed, limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
  });

/**
 * Fetch the actor's preferences, including the saved/pinned feed list.
 * The `preferences` array is heterogeneous; consumers pick out
 * `app.bsky.actor.defs#savedFeedsPrefV2`.
 */
export const getSavedFeeds = async (input: {
  client: Client;
  spaceId: string;
  accessTokenId: string;
}): Promise<SavedFeed[]> => {
  const response = await authedGet<{ preferences: Array<{ $type?: string; items?: SavedFeed[] }> }>({
    client: input.client,
    spaceId: input.spaceId,
    accessTokenId: input.accessTokenId,
    path: 'app.bsky.actor.getPreferences',
    query: {},
  });
  const savedPref = response.preferences.find((pref) => pref.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
  return savedPref?.items ?? [];
};
