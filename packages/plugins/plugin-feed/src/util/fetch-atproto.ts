//
// Copyright 2025 DXOS.org
//

import { Subscription } from '#types';
import { type FeedFetcher, type FetchOptions, type FetchResult } from './feed-fetcher';

const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';

/**
 * Extracts a Bluesky handle or DID from a URL or raw identifier.
 * Supports: `https://bsky.app/profile/{handle}`, `did:plc:...`, or bare handles like `alice.bsky.social`.
 */
export const parseAtprotoActor = (url: string): string => {
  const match = url.match(/bsky\.app\/profile\/([^/?#]+)/);
  if (match) {
    return match[1];
  }
  // Already a DID or bare handle.
  return url.replace(/^@/, '');
};

/** Fetches a public Bluesky author feed via the AT Protocol XRPC API. */
export const fetchAtproto: FeedFetcher = async (url: string, options?: FetchOptions): Promise<FetchResult> => {
  const actor = parseAtprotoActor(url);
  const endpoint = `${BSKY_PUBLIC_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=50`;

  const fetchUrl = options?.corsProxy ? `${options.corsProxy}${encodeURIComponent(endpoint)}` : endpoint;
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`AT Protocol fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const feedItems: AtprotoFeedViewPost[] = data.feed ?? [];

  const posts = feedItems.map((item) => {
    const record = item.post.record as AtprotoPostRecord;
    const link = `https://bsky.app/profile/${item.post.author.handle}/post/${item.post.uri.split('/').pop()}`;

    return Subscription.makePost({
      title: record.text?.slice(0, 100) ?? '',
      link,
      description: record.text ?? '',
      author: item.post.author.displayName ?? item.post.author.handle,
      published: record.createdAt,
      guid: item.post.uri,
    });
  });

  const authorName = feedItems[0]?.post.author.displayName ?? feedItems[0]?.post.author.handle ?? actor;

  const feed = Subscription.makeFeed({
    name: authorName,
    url,
    description: `Bluesky posts from @${feedItems[0]?.post.author.handle ?? actor}`,
    type: 'atproto',
  });

  return { feed, posts };
};

// Minimal type definitions for the XRPC response shape (public API, no auth).

type AtprotoFeedViewPost = {
  post: {
    uri: string;
    cid: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    record: unknown;
    likeCount?: number;
    repostCount?: number;
    replyCount?: number;
    indexedAt: string;
  };
  reason?: unknown;
};

type AtprotoPostRecord = {
  text?: string;
  createdAt: string;
  embed?: unknown;
  reply?: unknown;
};
