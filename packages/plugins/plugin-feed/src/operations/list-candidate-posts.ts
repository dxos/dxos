//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { FeedOperation } from '../types';
import { collectCandidates } from './util';

const handler: Operation.WithHandler<typeof FeedOperation.ListCandidatePosts> = FeedOperation.ListCandidatePosts.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef }) {
      const magazine = yield* Database.load(magazineRef);
      const candidates = yield* collectCandidates(magazine);
      return candidates.map(({ post, feed }) => ({
        postId: post.id,
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
