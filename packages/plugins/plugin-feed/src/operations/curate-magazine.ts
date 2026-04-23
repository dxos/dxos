//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace } from '@dxos/client/echo';
import { Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { Subscription } from '../types';
import { extractImageUrls, makeSnippet, stripHtml } from '../util';
import { CurateMagazine } from './definitions';

/**
 * Deterministic curation invoked by the Curate button. For every uncurated
 * candidate Post in the Magazine's referenced feeds, derives a snippet and
 * image from the Post's existing `description` (no HTTP fetch). Appends each
 * enriched Post's ref to `magazine.posts`. Skips Posts with empty descriptions.
 */
const handler: Operation.WithHandler<typeof CurateMagazine> = CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());
      const space = getSpace(magazine);
      invariant(space, 'Space not found.');

      const seenIds = new Set(magazine.posts.map((ref) => ref.dxn.toString()));
      const added: Ref.Ref<Subscription.Post>[] = [];

      for (const feedRef of magazine.feeds) {
        const feed = yield* Effect.promise(() => feedRef.load());
        const echoFeed = feed.feed?.target;
        if (!echoFeed) {
          continue;
        }
        const feedDxn = Feed.getQueueDxn(echoFeed);
        if (!feedDxn) {
          continue;
        }
        const queue = space.queues.get(feedDxn);
        const items = (yield* Effect.promise(() => queue.queryObjects())) ?? [];

        for (const item of items) {
          if (!Obj.instanceOf(Subscription.Post, item)) {
            continue;
          }
          const post = item;
          const postDxn = Obj.getDXN(post).toString();
          if (seenIds.has(postDxn)) {
            continue;
          }
          const source = post.description ?? '';
          const text = stripHtml(source);
          if (!text) {
            continue;
          }
          const snippet = makeSnippet(text);
          const imageUrl = extractImageUrls(source)[0];

          Obj.change(post, (post) => {
            const mutable = post as Obj.Mutable<typeof post>;
            mutable.snippet = snippet;
            if (imageUrl) {
              mutable.imageUrl = imageUrl;
            }
          });
          added.push(Ref.make(post));
          seenIds.add(postDxn);
        }
      }

      if (added.length > 0) {
        let appended = 0;
        Obj.change(magazine, (magazine) => {
          const mutable = magazine as Obj.Mutable<typeof magazine>;
          const existing = new Set(mutable.posts.map((ref) => ref.dxn.toString()));
          const fresh = added.filter((ref) => !existing.has(ref.dxn.toString()));
          if (fresh.length > 0) {
            mutable.posts = [...mutable.posts, ...fresh];
          }
          appended = fresh.length;
        });
        return { added: appended };
      }

      return { added: 0 };
    }),
  ),
);

export default handler;
