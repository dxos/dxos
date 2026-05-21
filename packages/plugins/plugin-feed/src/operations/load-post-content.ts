//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { FeedOperation, type Subscription } from '../types';
import { fetchArticle, getSubscriptionPostState, updateSubscriptionPostState } from '../util';

export default FeedOperation.LoadPostContent.pipe(
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

      const post: Subscription.Post = yield* Database.load(postRef).pipe(Effect.provide(Database.layer(db)));
      const postId = (post as { id: string }).id;
      const subscription = post.source?.target;
      // Without a resolved source Subscription we have nowhere to persist the
      // fetched body. Bail rather than mutating the queue-immutable Post.
      if (!subscription || !post.link) {
        return;
      }
      if (getSubscriptionPostState(subscription, postId).content) {
        return;
      }
      yield* Effect.tryPromise({
        try: async () => {
          // In the browser, route through the dev-server CORS proxy. Server-side callers
          // (e.g. agent operations) pass no proxy and fetch directly.
          const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
          const { text, imageUrls } = await fetchArticle(post.link!, { corsProxy });
          const hero = imageUrls[0];
          updateSubscriptionPostState(subscription, postId, {
            ...(text ? { content: text, fetchedAt: new Date().toISOString() } : {}),
            ...(hero ? { imageUrl: hero } : {}),
          });
        },
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });
    }),
  ),
);
