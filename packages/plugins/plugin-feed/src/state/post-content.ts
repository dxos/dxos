//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { createFeedServiceLayer, type Space } from '@dxos/client/echo';
import { Feed as EchoFeed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';

import { Subscription } from '../types';
import { extractImageUrls, makeSnippet, stripHtml } from '../extraction/text';

/**
 * Derived per-Post snippet/hero-image and the fetched-article content feed.
 *
 * Snippet/imageUrl are derived from `post.description`, or from the refined values on the
 * Subscription's `contentFeed` entries once the full article has been fetched.
 */

//
// Derived (post-intrinsic) snippet + hero image; prefer refined contentFeed values when present.
//

/** Plain-text snippet: the refined contentFeed value if loaded, else derived from `post.description`. */
export const getSnippet = (post: { description?: string }, content?: Subscription.PostContent): string =>
  content?.snippet ?? makeSnippet(stripHtml(post.description ?? ''));

/** Hero image url: the refined contentFeed value if loaded, else derived from `post.description`. */
export const getImageUrl = (post: { description?: string }, content?: Subscription.PostContent): string | undefined =>
  content?.imageUrl ?? extractImageUrls(post.description ?? '')[0];

//
// Content feed (fetched article bodies; carries refined snippet/imageUrl).
//

/**
 * Resolves a Post's source Subscription synchronously if its `source` ref is loaded, else undefined.
 */
export const getPostSubscription = (post: Subscription.Post): Subscription.Subscription | undefined =>
  post.source?.target;

/** Pick the newest PostContent when multiple entries reference the same Post. */
export const pickLatestPostContent = (
  entries: readonly Subscription.PostContent[],
): Subscription.PostContent | undefined => {
  if (entries.length === 0) {
    return undefined;
  }
  return [...entries].sort((entryA, entryB) => entryB.fetchedAt.localeCompare(entryA.fetchedAt))[0];
};

/**
 * Query for {@link Subscription.PostContent} entries referencing a Post via the reverse-ref index.
 * Scoped to the Subscription's post and content feeds.
 */
export const queryPostContentForPost = (
  subscription: Subscription.Subscription | Obj.Snapshot<Subscription.Subscription>,
  post: Subscription.Post | Obj.Snapshot<Subscription.Post>,
): Query.Any | undefined => {
  const postFeed = subscription.feed?.target;
  const contentFeed = subscription.contentFeed?.target;
  if (!postFeed || !contentFeed) {
    return undefined;
  }
  const postFeedUri = Obj.getURI(postFeed);
  const contentFeedUri = Obj.getURI(contentFeed);
  return Query.select(Filter.id(post.id))
    .referencedBy(Subscription.PostContent, 'post')
    .from(Scope.feed(postFeedUri), Scope.feed(contentFeedUri));
};

/** Looks up PostContent for a Post (newest wins); undefined if absent. */
export const findPostContent = async (
  subscription: Subscription.Subscription | Obj.Snapshot<Subscription.Subscription>,
  post: Subscription.Post | Obj.Snapshot<Subscription.Post>,
): Promise<Subscription.PostContent | undefined> => {
  const db = Obj.getDatabase(subscription);
  const query = queryPostContentForPost(subscription, post);
  if (!db || !query) {
    return undefined;
  }
  const entries = await db.query(query).run();
  return pickLatestPostContent(entries);
};

/** Returns the Subscription's `contentFeed`, lazily creating and attaching one when missing. */
const ensureContentFeed = (subscription: Subscription.Subscription): EchoFeed.Feed => {
  const existing = subscription.contentFeed?.target;
  if (existing) {
    return existing;
  }
  const created = EchoFeed.make();
  Obj.update(subscription, (subscription) => {
    const mutable = subscription as Obj.Mutable<typeof subscription>;
    mutable.contentFeed = Ref.make(created);
  });
  Obj.setParent(created, subscription);
  return created;
};

/**
 * Appends a {@link Subscription.PostContent} entry (body + refined snippet/imageUrl) to a
 * Subscription's `contentFeed`, lazily creating the feed on first use.
 */
export const appendPostContent = async (
  space: Space,
  subscription: Subscription.Subscription,
  entry: {
    post: Subscription.Post | Obj.Snapshot<Subscription.Post>;
    text: string;
    snippet?: string;
    imageUrl?: string;
    fetchedAt?: string;
  },
): Promise<void> => {
  const echoFeed = ensureContentFeed(subscription);
  const content = Obj.make(Subscription.PostContent, {
    post: Ref.fromURI(Obj.getURI(entry.post)),
    text: entry.text,
    ...(entry.snippet ? { snippet: entry.snippet } : {}),
    ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
    fetchedAt: entry.fetchedAt ?? new Date().toISOString(),
  });
  await EchoFeed.append(echoFeed, [content]).pipe(
    Effect.provide(createFeedServiceLayer(space.queues)),
    runAndForwardErrors,
  );
};
