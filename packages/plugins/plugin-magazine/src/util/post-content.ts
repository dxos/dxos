//
// Copyright 2026 DXOS.org
//

import { Subscription } from '#types';

import { extractImageUrls, makeSnippet, stripHtml, stripMarkdown } from './text.ts';

/**
 * Pure derivations of a Post's display snippet/hero-image, preferring the refined values on a
 * fetched {@link Subscription.PostContent} entry when present, else derived from `post.description`.
 */

/**
 * Plain-text snippet: the refined contentFeed value if loaded, else derived from `post.description`, else from
 * `post.content` when the description has no text (e.g. only a Media RSS image).
 */
export const getSnippet = (
  post: { description?: string; content?: string },
  content?: Subscription.PostContent,
): string => content?.snippet ?? (plainText(post.description) || plainText(post.content));

const plainText = (markup: string | undefined): string => makeSnippet(stripMarkdown(stripHtml(markup ?? '')));

/** Hero image url: the refined contentFeed value if loaded, else derived from `post.description`. */
export const getImageUrl = (post: { description?: string }, content?: Subscription.PostContent): string | undefined =>
  content?.imageUrl ?? extractImageUrls(post.description ?? '')[0];
