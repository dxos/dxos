//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { Blog } from '#types';

import { AddPublication } from './definitions';

const handler: Operation.WithHandler<typeof AddPublication> = AddPublication.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, target }) {
      const publication = Blog.makePublication({ name });

      const targetIsDatabase = Database.isDatabase(target);
      const db = targetIsDatabase ? target : Obj.getDatabase(target);
      invariant(db, 'Database not found.');

      yield* CollectionModel.add({
        object: publication,
        target: targetIsDatabase ? undefined : target,
      }).pipe(Effect.provide(Database.layer(db)));

      return Ref.make(publication);
    }),
  ),
);

export default handler;
