//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';

import { Database, Entity } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Load } from './definitions';

export default Load.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ refs }) {
      return yield* Effect.forEach(refs, Database.load).pipe(Effect.map(Array.map(Entity.toJSON)));
    }),
  ),
);
