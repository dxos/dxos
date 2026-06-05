//
// Copyright 2026 DXOS.org
//

import { type Subscription } from '../types';

import { extractImageUrls, makeSnippet, stripHtml } from './text';

/**
 * Pure derivations of a Post's display snippet/hero-image, preferring the refined values on a
 * fetched {@link Subscription.PostContent} entry when present, else derived from `post.description`.
 */

/** Plain-text snippet: the refined contentFeed value if loaded, else derived from `post.description`. */
export const getSnippet = (post: { description?: string }, content?: Subscription.PostContent): string =>
  content?.snippet ?? makeSnippet(stripHtml(post.description ?? ''));

/** Hero image url: the refined contentFeed value if loaded, else derived from `post.description`. */
export const getImageUrl = (post: { description?: string }, content?: Subscription.PostContent): string | undefined =>
  content?.imageUrl ?? extractImageUrls(post.description ?? '')[0];
