//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { StateMap, TagIndex } from '@dxos/app-toolkit';
import { createFeedServiceLayer, type Space } from '@dxos/client/echo';
import { type Database, Feed as EchoFeed, Filter, Obj, Query, Ref, Scope, Tag, URI } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';

import { type Magazine, Subscription } from '../types';
import { extractImageUrls, makeSnippet, stripHtml } from './extract';

/**
 * Per-Post state helpers. Posts live immutably in a Subscription's `feed` queue; their mutable state
 * is hosted off the Post id:
 *
 * - Shared (across magazines), on the {@link Subscription}: `readAt` (a {@link StateMap}) and the
 *   star/archive flags (a {@link TagIndex} over system {@link Tag} objects).
 * - Magazine-scoped, on the {@link Magazine}: `rank` (a {@link StateMap}).
 * - Derived from the Post (not stored): `snippet`/`imageUrl` — from `post.description`, or the
 *   refined values on the Subscription's `contentFeed` entries when the full article was fetched.
 */

const SYSTEM_TAG = {
  starred: { key: Subscription.STARRED_TAG, label: 'Starred', hue: 'amber' },
  archived: { key: Subscription.ARCHIVED_TAG, label: 'Archived', hue: 'neutral' },
} as const;

/** A system per-Post flag modelled as a tag. */
export type SystemTag = keyof typeof SYSTEM_TAG;

//
// Subscription-scoped shared state (readAt + star/archive tags).
//

/** ISO timestamp the Post was first opened, or undefined. */
export const getReadAt = (
  subscription: Subscription.Subscription | Obj.Snapshot<Subscription.Subscription> | undefined,
  postId: URI.URI,
): string | undefined => {
  if (!subscription) {
    return undefined;
  }
  // Snapshot<T> omits OfKind but preserves all data fields; StateMap.bind works at runtime.
  return StateMap.bind<Subscription.PostState>(subscription as Subscription.Subscription, 'postState').get(postId)
    .readAt;
};

/** Sets/clears the Post's read marker. */
export const setReadAt = (subscription: Subscription.Subscription, postId: string, value: string | undefined): void =>
  StateMap.bind<Subscription.PostState>(subscription, 'postState').patch(postId, { readAt: value });

/** Resolves the uri of an existing system Tag without creating one; `undefined` when absent. Async. */
export const findSystemTagUri = async (
  db: Pick<Database.Database, 'query'>,
  which: SystemTag,
): Promise<string | undefined> => {
  const [tag] = await db.query(Filter.foreignKeys(Tag.Tag, [SYSTEM_TAG[which].key])).run();
  return tag ? Obj.getURI(tag).toString() : undefined;
};

/** Whether a Post carries the given (resolved) tag uri on its Subscription. Pure. */
export const hasTag = (
  subscription: Subscription.Subscription | Obj.Snapshot<Subscription.Subscription> | undefined,
  postId: string,
  tagUri: string | undefined,
): boolean =>
  // Snapshot<T> omits OfKind but preserves all data fields; TagIndex.bind works at runtime.
  subscription && tagUri
    ? TagIndex.bind(subscription as Subscription.Subscription, 'tags')
        .objects(tagUri)
        .includes(postId)
    : false;

/** Sets/clears a system tag (`starred`/`archived`) on a Post (find-or-creates the Tag object). Async. */
export const setTag = async (
  subscription: Subscription.Subscription,
  postId: string,
  db: Pick<Database.Database, 'query' | 'add'>,
  which: SystemTag,
  value: boolean,
): Promise<void> => {
  const tag = await Tag.findOrCreate(db, SYSTEM_TAG[which]);
  const uri = Obj.getURI(tag).toString();
  const tags = TagIndex.bind(subscription, 'tags');
  if (value) {
    tags.setTag(uri, postId);
  } else {
    tags.unsetTag(uri, postId);
  }
};

//
// Magazine-scoped curation state (rank).
//

/** Agent-assigned relevance of a Post within a Magazine, or undefined. */
export const getRank = (magazine: Magazine.Magazine | undefined, postId: string): number | undefined =>
  magazine ? StateMap.bind<Magazine.PostState>(magazine, 'postState').get(postId).rank : undefined;

/** Sets the magazine-scoped rank for a Post. */
export const setRank = (magazine: Magazine.Magazine, postId: string, rank: number): void =>
  StateMap.bind<Magazine.PostState>(magazine, 'postState').patch(postId, { rank });

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
