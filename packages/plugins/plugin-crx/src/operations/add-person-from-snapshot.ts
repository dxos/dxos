//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { CrxOperation } from '#types';

import { toPerson } from '../mapping.ts';

const handler: Operation.WithHandler<typeof CrxOperation.AddPersonFromSnapshot> =
  CrxOperation.AddPersonFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const person = toPerson(snapshot);
        const { id } = yield* Operation.invoke(
          SpaceOperation.AddObject,
          { object: person },
          { spaceId: target.spaceId },
        );
        return { id };
      }),
    ),
  );

export default handler;
