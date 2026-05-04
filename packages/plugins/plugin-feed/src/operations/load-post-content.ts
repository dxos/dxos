//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { fetchArticle } from '../util';
import { LoadPostContent } from './definitions';

export default LoadPostContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      // Resolve the database from the ref's already-loaded target so we can supply
      // `Database.Service` ourselves — the React-side OperationInvoker doesn't compose
      // it into its runtime, so handlers that need ECHO access must provide their own
      // layer (matches the pattern in add-mailbox / sync-mailbox / get-trello-boards).
      const target = postRef.target;
      invariant(target, 'Post ref target not loaded.');
      const db = Obj.getDatabase(target);
      invariant(db, 'Post is not in a database.');

      const post = yield* Database.load(postRef).pipe(Effect.provide(Database.layer(db)));
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
