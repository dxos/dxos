//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { ListCandidatePosts } from './definitions';
import { collectCandidates } from './util';

const handler: Operation.WithHandler<typeof ListCandidatePosts> = ListCandidatePosts.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef }) {
      const magazine = yield* Database.load(magazineRef);
      const candidates = yield* collectCandidates(magazine);
      return candidates.map(({ post, feed }) => ({
        postId: Obj.getDXN(post).toString(),
        feedName: feed.name,
        title: post.title,
        description: post.description,
        author: post.author,
        published: post.published,
        link: post.link,
      }));
    }),
  ),
);

export default handler;
