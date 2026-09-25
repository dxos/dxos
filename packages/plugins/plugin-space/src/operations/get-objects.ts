//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.GetObjects> = SpaceOperation.GetObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ objects }) {
      const resolved = yield* Effect.forEach(objects, (object) => Database.load(object));
      return { objects: resolved };
    }),
  ),
);

export default handler;
