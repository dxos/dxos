//
// Copyright 2025 DXOS.org
//

import { type Subscription } from '#types';

export type FetchOptions = {
  corsProxy?: string;
};

export type FetchResult = {
  feed: Subscription.Feed;
  posts: Subscription.Post[];
};

/** Generic feed fetcher — protocol-specific implementations return normalized Subscription objects. */
export type FeedFetcher = (url: string, options?: FetchOptions) => Promise<FetchResult>;
