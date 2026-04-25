//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace } from '@dxos/client/echo';
import { Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { Subscription } from '../types';
import { extractImageUrls, findStarTag, makeSnippet, stripHtml } from '../util';
import { CurateMagazine } from './definitions';
import { partitionByKeepBound } from './util';

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

      // Compute the final post list — fresh additions plus existing, then pruned
      // by the `keep` bound — outside `Obj.change`. Doing two sequential
      // `mutable.posts = ...` writes inside one change block deep-maps the same
      // refs twice, which trips a "object already in db" invariant in ECHO's
      // ref handler. A single write avoids that.
      const existingDxns = new Set(magazine.posts.map((ref) => ref.dxn.toString()));
      const freshAdditions = added.filter((ref) => !existingDxns.has(ref.dxn.toString()));
      const appended = freshAdditions.length;

      const combinedRefs: Ref.Ref<Subscription.Post>[] = [...magazine.posts, ...freshAdditions];
      const keep = magazine.keep ?? Subscription.DEFAULT_KEEP;
      const starTag = findStarTag(space.db);
      // Refs whose targets aren't yet resolved are conservatively kept — a
      // future curation pass with resolved targets will reconsider them.
      const resolved: Array<{ ref: Ref.Ref<Subscription.Post>; post: Subscription.Post }> = [];
      const unresolved: Ref.Ref<Subscription.Post>[] = [];
      for (const ref of combinedRefs) {
        const post = ref.target;
        if (post) {
          resolved.push({ ref, post });
        } else {
          unresolved.push(ref);
        }
      }
      const { kept } = partitionByKeepBound(
        resolved.map(({ post }) => post),
        keep,
        starTag,
      );
      const keptDxns = new Set(kept.map((post) => Obj.getDXN(post).toString()));
      const filteredResolved = resolved.filter(({ ref }) => keptDxns.has(ref.dxn.toString())).map(({ ref }) => ref);
      const next = [...filteredResolved, ...unresolved];

      if (appended > 0 || next.length !== magazine.posts.length) {
        Obj.change(magazine, (magazine) => {
          const mutable = magazine as Obj.Mutable<typeof magazine>;
          mutable.posts = next;
        });
      }

      return { added: appended };
    }),
  ),
);

export default handler;
