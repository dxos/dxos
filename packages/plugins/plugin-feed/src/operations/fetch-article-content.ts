//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { FeedOperation } from '../types';
import { fetchArticle } from '../util';

const handler: Operation.WithHandler<typeof FeedOperation.FetchArticleContent> = FeedOperation.FetchArticleContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      invariant(post.link, 'Post has no link.');
      const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
      return yield* Effect.tryPromise({
        try: () => fetchArticle(post.link!, { corsProxy }),
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });
    }),
  ),
);

export default handler;
