//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';

import { Load } from './definitions';
import { expandRefs } from './expand-refs';

export default Load.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ refs, expandDepth = 0 }) {
      return yield* Effect.forEach(refs, (ref) =>
        Database.load(ref).pipe(Effect.flatMap((object) => expandRefs(Entity.toJSON(object), expandDepth))),
      );
    }),
  ),
);
