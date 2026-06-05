//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { FeedOperation, Subscription } from '../types';

const handler: Operation.WithHandler<typeof FeedOperation.AddPostToMagazine> = FeedOperation.AddPostToMagazine.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef, post: postRef, snippet, imageUrl }) {
      const magazine = yield* Database.load(magazineRef);
      const post = yield* Database.load(postRef);

      const postUri = Obj.getURI(post);
      const subscription = post.source?.target;

      // Agent-provided snippet/imageUrl are refined per-Post values: store them on the Subscription's
      // contentFeed (shared across magazines, preferred over the description-derived defaults).
      const space = getSpace(magazine);
      if (subscription && space && (snippet || imageUrl)) {
        yield* Effect.promise(() => Subscription.appendPostContent(space, subscription, { post, text: '', snippet, imageUrl }));
      }

      Obj.update(magazine, (magazine) => {
        const mutable = magazine as Obj.Mutable<typeof magazine>;
        const alreadyCurated = mutable.posts.some((ref) => ref.uri === postUri);
        if (!alreadyCurated) {
          mutable.posts = [...mutable.posts, Ref.make(post)];
        }
      });

      return post;
    }),
  ),
);

export default handler;
