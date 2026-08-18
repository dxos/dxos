//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';

import { SpaceObjectOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceObjectOperation.RemoveTag> = SpaceObjectOperation.RemoveTag.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tag, object }) {
      const resolved = yield* Database.load(object);
      Entity.update(resolved, (entity) => Entity.removeTag(entity, tag));
      return { object: Entity.toJSON(resolved) };
    }),
  ),
);

export default handler;
