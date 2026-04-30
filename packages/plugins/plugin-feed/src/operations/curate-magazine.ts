//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace, type Space } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { type Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { type Magazine, Subscription } from '../types';
import { extractImageUrls, makeSnippet, stripHtml } from '../util';
import { CurateMagazine } from './definitions';

/**
 * Extracts the bare ECHO object id from a DXN. Robust to DXN form differences
 * — `dxn:echo:@:<id>` (local), `dxn:echo:<spaceId>:<id>` (space-scoped),
 * `dxn:queue:<...>:<id>` (queue-scoped) — by always taking the last part.
 */
const dxnToObjectId = (dxn: { parts: readonly any[] }): string => String(dxn.parts[dxn.parts.length - 1]);

/**
 * Returns the canonical space.db proxy for a Post by id, if it has been
 * registered there before; otherwise registers the supplied queue-side proxy
 * and returns it.
 *
 * Why this exists: `queue.queryObjects()` re-decodes from JSON on every call,
 * yielding a fresh proxy backed by a fresh `ObjectCore` whose
 * `core.database` link is unset. If the underlying object was previously
 * added to `space.db` (e.g. by a prior curate's `createRef` →
 * `database.add`), `space.db._objects` already maps that id to an OLDER
 * core. Letting the deep-mapper run `createRef` on the fresh queue proxy
 * then calls `database.add(freshCore)` → `addCore` → the
 * `!_objects.has(core.id)` invariant fires.
 *
 * Reusing the canonical proxy (its core has `core.database === space.db`,
 * so `addCore` returns early) sidesteps the invariant entirely. For a Post
 * being curated for the first time we still call `db.add` ourselves, which
 * is the safe path because the id is genuinely new.
 */
const reuseOrAdd = async (db: Database.Database, post: Subscription.Post): Promise<Subscription.Post> => {
  const id = (post as { id: string }).id;
  const existing = await db
    .query(Filter.id(id))
    .first()
    .catch(() => undefined);
  if (existing) {
    return existing as Subscription.Post;
  }

  return db.add(post);
};

/**
 * Pure-additive curation logic, extracted from the operation handler so it can
 * be exercised directly from unit tests without an Operation runtime.
 *
 * For every uncurated candidate Post in the Magazine's referenced feeds,
 * derives a snippet and image from the Post's existing `description` (no HTTP fetch).
 * Appends each enriched Post's ref to `magazine.posts`.
 * Skips Posts with empty descriptions.
 *
 * The Magazine-level `keep` bound is enforced separately by the Clear button
 * (and the post-curate prune in `MagazineArticle.handleCurate`) so curate
 * stays purely additive — making it safe to re-run without pruning
 * previously-curated items the user may want to keep.
 */
export const curateMagazine = async (space: Space, magazine: Magazine.Magazine): Promise<{ added: number }> => {
  const seenIds = new Set(magazine.posts.map((ref) => dxnToObjectId(ref.dxn)));
  const added: Ref.Ref<Subscription.Post>[] = [];

  for (const feedRef of magazine.feeds) {
    const feed = await feedRef.load();
    const echoFeed = feed.feed?.target;
    if (!echoFeed) {
      continue;
    }
    const feedDxn = Feed.getQueueDxn(echoFeed);
    if (!feedDxn) {
      continue;
    }

    const queue = space.queues.get(feedDxn);
    const items = (await queue.queryObjects()) ?? [];

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

      // Resolve to the canonical space.db proxy (or register if new) so
      // the ref we hand to the deep-mapper has a working `core.database`
      // link. Without this, a re-curate after Clear (or any path that
      // re-encounters a post already in space.db via a fresh queue proxy)
      // trips `addCore`'s `!_objects.has(core.id)` invariant.
      const post = await reuseOrAdd(space.db, queuePost);

      Obj.change(post, (post) => {
        const mutable = post as Obj.Mutable<typeof post>;
        mutable.snippet = snippet;
        if (imageUrl) {
          mutable.imageUrl = imageUrl;
        }
      });
      added.push(Ref.make(post));
      seenIds.add(postId);
    }
  }

  let appended = 0;
  if (added.length > 0) {
    Obj.change(magazine, (magazine) => {
      const mutable = magazine as Obj.Mutable<typeof magazine>;
      const existing = new Set(mutable.posts.map((ref) => dxnToObjectId(ref.dxn)));
      const fresh = added.filter((ref) => !existing.has(dxnToObjectId(ref.dxn)));
      if (fresh.length > 0) {
        mutable.posts = [...mutable.posts, ...fresh];
      }
      appended = fresh.length;
    });
  }

  return { added: appended };
};

const handler: Operation.WithHandler<typeof CurateMagazine> = CurateMagazine.pipe(
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
