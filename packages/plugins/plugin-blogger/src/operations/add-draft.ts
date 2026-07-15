//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { Blog } from '#types';

import { AddDraft } from './definitions';

const handler: Operation.WithHandler<typeof AddDraft> = AddDraft.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      const draft = Blog.makeDraft({ label: `Draft ${(post.drafts?.length ?? 0) + 1}` });

      // No explicit `Database.add(draft)` here: `post` is already attached to the database
      // (every `AddDraft.post` is created via `AddPost`), so pushing `Ref.make(draft)` onto
      // `post.drafts` below attaches `draft` to the same database as a side effect of the
      // reference assignment. An explicit add here was confirmed dead code by regression —
      // removing it changed no observable behavior.
      Obj.update(post, (post) => {
        post.drafts = [...(post.drafts ?? []), Ref.make(draft)];
      });

      return Ref.make(draft);
    }),
  ),
);

export default handler;
