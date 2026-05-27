//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { FeedOperation } from '../types';
import { updateMagazinePostState, updateSubscriptionPostState } from '../util';

const handler: Operation.WithHandler<typeof FeedOperation.AddPostToMagazine> = FeedOperation.AddPostToMagazine.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef, post: postRef, snippet, imageUrl }) {
      const magazine = yield* Database.load(magazineRef);
      const post = yield* Database.load(postRef);

      const postUri = Obj.getURI(post);
      const postId = (post as { id: string }).id;
      const subscription = post.source?.target;

      // snippet is a magazine-scoped curation artifact; imageUrl is a
      // per-Post hero used across magazines and lives on the Subscription
      // side map.
      updateMagazinePostState(magazine, postId, { snippet });
      if (imageUrl !== undefined && subscription) {
        updateSubscriptionPostState(subscription, postId, { imageUrl });
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
