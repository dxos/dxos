//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

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
