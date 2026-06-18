//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { CrxOperation } from '#types';

import { toPerson } from '../mapping';

const handler: Operation.WithHandler<typeof CrxOperation.AddPersonFromSnapshot> =
  CrxOperation.AddPersonFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const person = toPerson(snapshot);
        const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: person, target });
        return { id };
      }),
    ),
  );

export default handler;
