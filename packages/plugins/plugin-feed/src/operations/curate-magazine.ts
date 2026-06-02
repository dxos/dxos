//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { createFeedServiceLayer, getSpace, type Space } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { FeedOperation } from '../types';
import { type Magazine, Subscription } from '../types';
import { dxnToEntityId } from '../util';

/**
 * Pure-additive curation logic, extracted from the operation handler so it can
 * be exercised directly from unit tests without an Operation runtime.
 *
 * For every uncurated candidate Post (with a non-empty description) in the Magazine's referenced
 * feeds, appends the Post's queue-DXN ref to `magazine.posts`. The Post stays immutable in its
 * queue; snippet/imageUrl are derived at render time (see `post-state`), so curation stores no
 * per-Post metadata here.
 *
 * The Magazine-level `keep` bound is enforced separately, so curate stays purely additive — safe to
 * re-run without pruning previously-curated items.
 */
export const curateMagazine = async (space: Space, magazine: Magazine.Magazine): Promise<{ added: number }> => {
  const seenIds = new Set(magazine.posts.map((ref) => dxnToEntityId(ref.uri)));
  const fresh: Ref.Ref<Subscription.Post>[] = [];

  const feedServiceLayer = createFeedServiceLayer(space.queues);

  for (const feedRef of magazine.feeds) {
    const feed = await feedRef.load();
    const echoFeed = feed.feed?.target;
    if (!echoFeed || !Feed.getQueueUri(echoFeed)) {
      continue;
    }

    const items = await Feed.runQuery(echoFeed, Filter.everything()).pipe(
      Effect.provide(feedServiceLayer),
      runAndForwardErrors,
    );

    for (const item of items) {
      if (!Obj.instanceOf(Subscription.Post, item)) {
        continue;
      }
      const postId = (item as { id: string }).id;
      if (seenIds.has(postId) || !item.description) {
        continue;
      }
      // The Ref carries the queue DXN; the Post stays in the queue and never enters space.db.
      fresh.push(Ref.make(item));
      seenIds.add(postId);
    }
  }

  let appended = 0;
  if (fresh.length > 0) {
    Obj.update(magazine, (magazine) => {
      const mutable = magazine as Obj.Mutable<typeof magazine>;
      const existing = new Set(mutable.posts.map((ref) => dxnToEntityId(ref.uri)));
      const toAdd = fresh.filter((ref) => !existing.has(dxnToEntityId(ref.uri)));
      mutable.posts = [...mutable.posts, ...toAdd];
      appended = toAdd.length;
    });
  }

  return { added: appended };
};

const handler: Operation.WithHandler<typeof FeedOperation.CurateMagazine> = FeedOperation.CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());
      const space = getSpace(magazine);
      invariant(space, 'Space not found.');
      return yield* Effect.promise(() => curateMagazine(space, magazine));
    }),
  ),
);

export default handler;
