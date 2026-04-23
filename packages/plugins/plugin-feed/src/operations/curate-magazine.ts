//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { type Subscription } from '../types';
import { extractImageUrls, makeSnippet, stripHtml } from '../util';
import { CurateMagazine } from './definitions';
import { collectCandidates } from './util';

/**
 * Deterministic curation: for every uncurated candidate Post, derive a snippet
 * and image from the Post's existing `description` (no HTTP fetch). Appends each
 * enriched Post's ref to `magazine.posts`. Skips Posts with no description.
 */
const handler: Operation.WithHandler<typeof CurateMagazine> = CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ magazine: magazineRef }) {
      const magazine = yield* Database.load(magazineRef);
      const candidates = yield* collectCandidates(magazine);
      const added: Ref.Ref<Subscription.Post>[] = [];

      for (const { post } of candidates) {
        const source = post.description ?? '';
        const text = stripHtml(source);
        if (!text) {
          continue;
        }
        const snippet = makeSnippet(text);
        const imageUrl = extractImageUrls(source)[0];

        Obj.change(post, (post) => {
          const mutable = post as Obj.Mutable<typeof post>;
          mutable.snippet = snippet;
          if (imageUrl) {
            mutable.imageUrl = imageUrl;
          }
        });
        added.push(Ref.make(post));
      }

      if (added.length > 0) {
        let appended = 0;
        Obj.change(magazine, (magazine) => {
          const mutable = magazine as Obj.Mutable<typeof magazine>;
          const existing = new Set(mutable.posts.map((ref) => ref.dxn.toString()));
          const fresh = added.filter((ref) => !existing.has(ref.dxn.toString()));
          if (fresh.length > 0) {
            mutable.posts = [...mutable.posts, ...fresh];
          }
          appended = fresh.length;
        });
        return { added: appended };
      }

      return { added: 0 };
    }),
  ),
);

export default handler;
