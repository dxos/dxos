//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';

import { FeedOperation } from '../types';
import { makeSnippet, stripHtml } from '../extraction';
import { browserCorsProxy, fetchArticle } from '../sources';
import { appendPostContent, findPostContent } from '../state';

export default FeedOperation.LoadPostContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef, force }) {
      // The Post is a queue item (its source Subscription lives in space.db).
      // Resolve the source Subscription first; everything that needs a
      // Database / Space binding comes from there. The Post's own
      // `Obj.getDatabase` link isn't reliably set on every code path that
      // produces a queue-decoded proxy, but the Subscription is always in
      // space.db.
      const post = postRef.target;
      invariant(post, 'Post ref target not loaded.');
      const subscription = post.source?.target;
      if (!subscription || !post.link) {
        return;
      }
      const space = getSpace(subscription);
      invariant(space, 'Subscription is not in a space.');
      // Idempotent by default (first-open auto-load); `force` re-fetches for the reader's refresh.
      if (!force) {
        const existing = yield* Effect.tryPromise(() => findPostContent(subscription, post));
        if (existing) {
          return;
        }
      }

      yield* Effect.tryPromise({
        try: async () => {
          // In the browser, route through the dev-server CORS proxy. Server-side callers
          // (e.g. agent operations) pass no proxy and fetch directly.
          const { text, imageUrls } = await fetchArticle(post.link!, { corsProxy: browserCorsProxy() });
          if (text) {
            // Store the body plus refined snippet/imageUrl derived from the full article — preferred
            // over the description-derived defaults wherever the Post is rendered.
            await appendPostContent(space, subscription, {
              post,
              text,
              snippet: makeSnippet(stripHtml(text)),
              imageUrl: imageUrls[0],
            });
          }
        },
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });
    }),
  ),
);
