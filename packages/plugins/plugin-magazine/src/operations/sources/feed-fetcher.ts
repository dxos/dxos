//
// Copyright 2025 DXOS.org
//

import * as Data from 'effect/Data';
import type * as Effect from 'effect/Effect';

import { type Subscription } from '#types';

export type FetchOptions = {
  corsProxy?: string;
};

export type FetchResult = {
  feed: Subscription.Subscription;
  posts: Subscription.Post[];
};

/** Failure fetching or decoding a feed (network error, non-2xx response, or malformed body). */
export class FeedFetchError extends Data.TaggedError('FeedFetchError')<{
  message: string;
  cause?: unknown;
}> {}

/** Generic feed fetcher — protocol-specific implementations return normalized Subscription objects. */
export type FeedFetcher = (url: string, options?: FetchOptions) => Effect.Effect<FetchResult, FeedFetchError>;
