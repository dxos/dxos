//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { extractImageUrls, stripHtml } from '../util';
import { FetchArticleContent } from './definitions';

const handler: Operation.WithHandler<typeof FetchArticleContent> = FetchArticleContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      invariant(post.link, 'Post has no link.');
      const html = yield* Effect.tryPromise({
        try: () =>
          fetch(post.link!).then((response) => {
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            }
            return response.text();
          }),
        catch: (error) => new Error(String(error)),
      });
      return {
        text: stripHtml(html),
        imageUrls: extractImageUrls(html),
      };
    }),
  ),
);

export default handler;
