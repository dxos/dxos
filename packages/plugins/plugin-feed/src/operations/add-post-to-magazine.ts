//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { AddPostToMagazine } from './definitions';

const handler: Operation.WithHandler<typeof AddPostToMagazine> = AddPostToMagazine.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef, post: postRef, snippet, imageUrl }) {
      const magazine = yield* Database.load(magazineRef);
      const post = yield* Database.load(postRef);

      const postDxn = Obj.getDXN(post).toString();
      const alreadyCurated = magazine.posts.some((ref) => ref.dxn.toString() === postDxn);

      if (!alreadyCurated) {
        Obj.change(post, (obj) => {
          const mutable = obj as Obj.Mutable<typeof obj>;
          mutable.snippet = snippet;
          if (imageUrl) {
            mutable.imageUrl = imageUrl;
          }
        });
        Obj.change(magazine, (obj) => {
          const mutable = obj as Obj.Mutable<typeof obj>;
          mutable.posts = [...mutable.posts, Ref.make(post)];
        });
      }

      return post;
    }),
  ),
);

export default handler;
