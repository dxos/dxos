//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';

import { SpaceObjectOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceObjectOperation.GetObject> = SpaceObjectOperation.GetObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const resolved = yield* Database.load(object);
      return { object: Entity.toJSON(resolved) };
    }),
  ),
);

export default handler;
