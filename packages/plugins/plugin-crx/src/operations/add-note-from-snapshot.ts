//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { CrxOperation } from '#types';

import { toNote } from '../mapping';

const handler: Operation.WithHandler<typeof CrxOperation.AddNoteFromSnapshot> = CrxOperation.AddNoteFromSnapshot.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ snapshot, target }) {
      const note = toNote(snapshot);
      const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: note, target });
      return { id };
    }),
  ),
);

export default handler;
