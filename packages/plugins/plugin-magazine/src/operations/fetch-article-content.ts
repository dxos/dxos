//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { FeedOperation } from '#types';

import { ArticleFetchError } from './errors.ts';
import { browserCorsProxy, fetchArticle } from './sources/index.ts';

const handler: Operation.WithHandler<typeof FeedOperation.FetchArticleContent> = FeedOperation.FetchArticleContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      invariant(post.link, 'Post has no link.');
      return yield* Effect.tryPromise({
        try: () => fetchArticle(post.link!, { corsProxy: browserCorsProxy() }),
        catch: ArticleFetchError.wrap(),
      });
    }),
  ),
);

export default handler;
