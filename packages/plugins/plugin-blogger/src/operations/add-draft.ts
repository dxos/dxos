//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { Blogger } from '#types';

import { AddDraft } from './definitions';

const handler: Operation.WithHandler<typeof AddDraft> = AddDraft.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ post: postRef, createdAt }) {
      const post = yield* Database.load(postRef);
      const draft = Blogger.makeDraft({ label: `Draft ${(post.drafts?.length ?? 0) + 1}`, createdAt });
      yield* Database.add(draft);

      Obj.update(post, (post) => {
        post.drafts = [...(post.drafts ?? []), Ref.make(draft)];
      });

      return Ref.make(draft);
    }),
  ),
);

export default handler;
