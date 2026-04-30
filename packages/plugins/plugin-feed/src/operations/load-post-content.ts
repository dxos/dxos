//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { fetchArticle } from '../util';
import { LoadPostContent } from './definitions';

export default LoadPostContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      if (!post.link || post.content) {
        return;
      }
      yield* Effect.tryPromise({
        try: async () => {
          // In the browser, route through the dev-server CORS proxy. Server-side callers
          // (e.g. agent operations) pass no proxy and fetch directly.
          const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
          const { text, imageUrls } = await fetchArticle(post.link!, { corsProxy });
          const hero = imageUrls[0];
          Obj.change(post, (post) => {
            const mutable = post as Obj.Mutable<typeof post>;
            if (text) {
              mutable.content = text;
            }
            if (hero) {
              mutable.imageUrl = hero;
            }
          });
        },
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });
    }),
  ),
);
