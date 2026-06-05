//
// Copyright 2026 DXOS.org
//

import { StateMap, TagIndex } from '@dxos/app-toolkit';
import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';

import { type Magazine, Subscription } from '../types';

/**
 * Per-Post mutable state, keyed by Post entity id (Posts themselves are immutable queue items):
 *
 * - Shared across magazines, on the {@link Subscription}: `readAt` (a {@link StateMap}) and the
 *   star/archive flags (a {@link TagIndex} over system {@link Tag} objects).
 * - Magazine-scoped, on the {@link Magazine}: `rank` (a {@link StateMap}).
 *
 * Derived snippet/imageUrl and the fetched-article content feed live in `./post-content`.
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
  postId: EntityId,
): string | undefined => {
  if (!subscription) {
    return undefined;
  }
  // Snapshot<T> omits OfKind but preserves all data fields; StateMap.bind works at runtime.
  return StateMap.bind<Subscription.PostState>(subscription as Subscription.Subscription, 'postState').get(postId)
    .readAt;
};

/** Sets/clears the Post's read marker. */
export const setReadAt = (
  subscription: Subscription.Subscription,
  postId: EntityId,
  value: string | undefined,
): void => StateMap.bind<Subscription.PostState>(subscription, 'postState').patch(postId, { readAt: value });

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
  postId: EntityId,
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
  postId: EntityId,
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
export const getRank = (magazine: Magazine.Magazine | undefined, postId: EntityId): number | undefined =>
  magazine ? StateMap.bind<Magazine.PostState>(magazine, 'postState').get(postId).rank : undefined;

/** Sets the magazine-scoped rank for a Post. */
export const setRank = (magazine: Magazine.Magazine, postId: EntityId, rank: number): void =>
  StateMap.bind<Magazine.PostState>(magazine, 'postState').patch(postId, { rank });
