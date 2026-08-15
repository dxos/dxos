//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';

import { SpaceObjectOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceObjectOperation.GetObjects> = SpaceObjectOperation.GetObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ objects }) {
      const resolved = yield* Effect.forEach(objects, (object) => Database.load(object));
      return { objects: resolved.map((object) => Entity.toJSON(object)) };
    }),
  ),
);

export default handler;
