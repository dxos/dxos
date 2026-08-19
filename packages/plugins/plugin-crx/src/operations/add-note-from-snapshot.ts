//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { CrxOperation } from '#types';

import { toNote } from '../mapping';

const handler: Operation.WithHandler<typeof CrxOperation.AddNoteFromSnapshot> = CrxOperation.AddNoteFromSnapshot.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ snapshot, target }) {
      const note = toNote(snapshot);
      // AddObject declares Database.Service; a spaceId-less invocation satisfies it from the calling context.
      const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: note, target }).pipe(
        Effect.provide(Database.layer(target)),
      );
      return { id };
    }),
  ),
);

export default handler;
