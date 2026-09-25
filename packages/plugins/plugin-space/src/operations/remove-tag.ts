//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveTag> = SpaceOperation.RemoveTag.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tag, object }) {
      const resolved = yield* Database.load(object);
      Entity.update(resolved, (resolved) => Entity.removeTag(resolved, tag));
      return { object: resolved };
    }),
  ),
);

export default handler;
