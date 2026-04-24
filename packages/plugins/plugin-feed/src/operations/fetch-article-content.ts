//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { fetchArticle } from '../util';
import { FetchArticleContent } from './definitions';

const handler: Operation.WithHandler<typeof FetchArticleContent> = FetchArticleContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      invariant(post.link, 'Post has no link.');
      return yield* Effect.tryPromise({
        try: () => fetchArticle(post.link!),
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });
    }),
  ),
);

export default handler;
