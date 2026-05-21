//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { createFeedServiceLayer, type Space } from '@dxos/client/echo';
import { Feed, Filter, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';

import { type Magazine, Subscription } from '../types';

/**
 * Read/write helpers for the sidecar state maps that replace mutable fields on
 * {@link Subscription.Post}. Posts live in their Subscription's queue and are
 * immutable; their state lives on:
 *
 * - {@link Subscription.Subscription.postState} — per-Post user state (read/
 *   archived/starred/content), shared across every magazine that references
 *   the Post.
 * - {@link Magazine.Magazine.postState} — per-Post curation cache (snippet/
 *   imageUrl/rank), magazine-scoped.
 */

export type SubscriptionPostState = NonNullable<Subscription.Subscription['postState']>[string];
export type MagazinePostState = NonNullable<Magazine.Magazine['postState']>[string];

/**
 * Returns the user-state entry for the given Post id on the given Subscription.
 * Returns an empty object when no entry exists yet — callers can read fields
 * uniformly without an `?` chain.
 */
export const getSubscriptionPostState = (
  subscription: Subscription.Subscription | undefined,
  postId: string,
): SubscriptionPostState => subscription?.postState?.[postId] ?? {};

/** Returns the curation-cache entry for the given Post id on the given Magazine. */
export const getMagazinePostState = (magazine: Magazine.Magazine | undefined, postId: string): MagazinePostState =>
  magazine?.postState?.[postId] ?? {};

/**
 * Patches the user-state entry for the given Post id on the given Subscription.
 * Merges into any existing entry; nulls/undefineds in `patch` overwrite.
 */
export const updateSubscriptionPostState = (
  subscription: Subscription.Subscription,
  postId: string,
  patch: Partial<SubscriptionPostState>,
): void => {
  Obj.update(subscription, (subscription) => {
    const mutable = subscription as Obj.Mutable<typeof subscription>;
    const next = { ...(mutable.postState ?? {}) };
    next[postId] = { ...next[postId], ...patch };
    mutable.postState = next;
  });
};

/** Patches the curation-cache entry for the given Post id on the given Magazine. */
export const updateMagazinePostState = (
  magazine: Magazine.Magazine,
  postId: string,
  patch: Partial<MagazinePostState>,
): void => {
  Obj.update(magazine, (magazine) => {
    const mutable = magazine as Obj.Mutable<typeof magazine>;
    const next = { ...(mutable.postState ?? {}) };
    next[postId] = { ...next[postId], ...patch };
    mutable.postState = next;
  });
};

/**
 * Resolves a Post's source Subscription synchronously if its `source` ref is
 * loaded, otherwise returns undefined. Callers that need to mutate per-Post
 * state should ensure the source is loaded first (or kick off a load and let
 * React re-render when it resolves).
 */
export const getPostSubscription = (post: Subscription.Post): Subscription.Subscription | undefined => {
  return post.source?.target;
};

/**
 * Loads every {@link Subscription.PostContent} entry from a Subscription's
 * `contentFeed` queue. Returns a map keyed by Post id so callers can look up
 * by the bare Post id rather than scanning the array. Returns an empty map
 * when no contentFeed exists or it has no entries.
 *
 * Pass `space` so the feed service can be provided to the Effect runtime.
 */
export const loadContentEntries = async (
  space: Space,
  subscription: Subscription.Subscription,
): Promise<Map<string, Subscription.PostContent>> => {
  const echoFeed = subscription.contentFeed?.target;
  if (!echoFeed || !Feed.getQueueDxn(echoFeed)) {
    return new Map();
  }
  const items = await Feed.runQuery(echoFeed, Filter.type(Subscription.PostContent)).pipe(
    Effect.provide(createFeedServiceLayer(space.queues)),
    runAndForwardErrors,
  );
  const map = new Map<string, Subscription.PostContent>();
  for (const item of items) {
    map.set(item.postId, item);
  }
  return map;
};

/**
 * Looks up a single {@link Subscription.PostContent} entry by Post id.
 * Returns undefined when no entry has been appended yet.
 */
export const findPostContent = async (
  space: Space,
  subscription: Subscription.Subscription,
  postId: string,
): Promise<Subscription.PostContent | undefined> => {
  const map = await loadContentEntries(space, subscription);
  return map.get(postId);
};

/**
 * Appends a new {@link Subscription.PostContent} entry to a Subscription's
 * `contentFeed`. Caller is responsible for idempotency — call
 * {@link findPostContent} first if you only want to write once per Post.
 */
export const appendPostContent = async (
  space: Space,
  subscription: Subscription.Subscription,
  entry: { postId: string; text: string; fetchedAt?: string },
): Promise<void> => {
  const echoFeed = subscription.contentFeed?.target;
  if (!echoFeed) {
    throw new Error('Subscription has no contentFeed');
  }
  const content = Obj.make(Subscription.PostContent, {
    postId: entry.postId,
    text: entry.text,
    fetchedAt: entry.fetchedAt ?? new Date().toISOString(),
  });
  await Feed.append(echoFeed, [content]).pipe(
    Effect.provide(createFeedServiceLayer(space.queues)),
    runAndForwardErrors,
  );
};
