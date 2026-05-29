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
import {
  dxnToEntityId,
  extractImageUrls,
  getSubscriptionPostState,
  makeSnippet,
  stripHtml,
  updateSubscriptionPostState,
} from '../util';

/**
 * Pure-additive curation logic, extracted from the operation handler so it can
 * be exercised directly from unit tests without an Operation runtime.
 *
 * For every uncurated candidate Post in the Magazine's referenced feeds,
 * derives a snippet and image from the Post's existing `description` (no HTTP fetch).
 * Appends each Post's queue-DXN ref to `magazine.posts` and stores the derived
 * snippet/imageUrl in `magazine.postState[postId]` — the Post itself is never
 * mutated and never enters `space.db`.
 *
 * Skips Posts with empty descriptions.
 *
 * The Magazine-level `keep` bound is enforced separately by the Clear button
 * (and the post-curate prune in `MagazineArticle.handleCurate`) so curate
 * stays purely additive — making it safe to re-run without pruning
 * previously-curated items the user may want to keep.
 */
export const curateMagazine = async (space: Space, magazine: Magazine.Magazine): Promise<{ added: number }> => {
  const seenIds = new Set(magazine.posts.map((ref) => dxnToEntityId(ref.uri)));
  const added: {
    ref: Ref.Ref<Subscription.Post>;
    id: string;
    subscription: Subscription.Subscription;
    snippet: string;
    imageUrl?: string;
  }[] = [];

  const feedServiceLayer = createFeedServiceLayer(space.queues);

  for (const feedRef of magazine.feeds) {
    const feed = await feedRef.load();
    const echoFeed = feed.feed?.target;
    if (!echoFeed) {
      continue;
    }
    if (!Feed.getQueueUri(echoFeed)) {
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

      const queuePost = item;
      const postId = (queuePost as { id: string }).id;
      if (seenIds.has(postId)) {
        continue;
      }

      const source = queuePost.description ?? '';
      // Snippet is rendered as plain text on the magazine tile, so strip HTML rather than
      // converting to markdown — otherwise `**bold**` / `[link](url)` syntax leaks through.
      const text = stripHtml(source);
      if (!text) {
        continue;
      }
      const snippet = makeSnippet(text);
      const imageUrl = extractImageUrls(source)[0];

      // The Ref carries the queue DXN (see EchoHandler.createRef short-circuit
      // for Queue-kind SelfDXNId). The Post stays in the queue; per-magazine
      // state goes onto `magazine.postState` and per-Post state (imageUrl)
      // goes onto `subscription.postState` below.
      added.push({ ref: Ref.make(queuePost), id: postId, subscription: feed, snippet, imageUrl });
      seenIds.add(postId);
    }
  }

  let appended = 0;
  if (added.length > 0) {
    Obj.update(magazine, (magazine) => {
      const mutable = magazine as Obj.Mutable<typeof magazine>;
      const existing = new Set(mutable.posts.map((ref) => dxnToEntityId(ref.uri)));
      const fresh = added.filter((entry) => !existing.has(entry.id));
      if (fresh.length === 0) {
        appended = 0;
        return;
      }

      // Single Obj.update for both the ref list and the magazine-scoped
      // curation cache (snippet, rank) so a single notification fires.
      mutable.posts = [...mutable.posts, ...fresh.map((entry) => entry.ref)];
      const nextState = { ...(mutable.postState ?? {}) };
      for (const entry of fresh) {
        nextState[entry.id] = {
          ...nextState[entry.id],
          snippet: entry.snippet,
        };
      }
      mutable.postState = nextState;
      appended = fresh.length;
    });

    // imageUrl is per-Post (shared across magazines): write it to each
    // contributing subscription's postState. Skip writes that would clobber
    // an already-present imageUrl (e.g. a later LoadPostContent refinement).
    for (const entry of added) {
      if (!entry.imageUrl) {
        continue;
      }
      if (getSubscriptionPostState(entry.subscription, entry.id).imageUrl) {
        continue;
      }
      updateSubscriptionPostState(entry.subscription, entry.id, { imageUrl: entry.imageUrl });
    }
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
