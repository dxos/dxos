//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { Blogger } from '#types';

import { AddPost } from './definitions';

const handler: Operation.WithHandler<typeof AddPost> = AddPost.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ publication: publicationRef, name, createdAt, target }) {
      const publication = yield* Database.load(publicationRef);
      const post = Blogger.makePost({ name, createdAt });

      const targetIsDatabase = Database.isDatabase(target);
      const db = targetIsDatabase ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');

      yield* CollectionModel.add({
        object: post,
        target: targetIsDatabase ? undefined : target,
      }).pipe(Effect.provide(Database.layer(db)));

      Obj.update(publication, (publication) => {
        publication.posts = [...(publication.posts ?? []), Ref.make(post)];
      });

      return Ref.make(post);
    }),
  ),
);

export default handler;
