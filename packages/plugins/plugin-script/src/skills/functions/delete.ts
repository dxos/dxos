//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Delete } from './definitions';

export default Delete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn }) {
      const { db } = yield* Database.Service;
      const loaded = yield* Database.load(fn);
      if (loaded.source?.target) {
        db.remove(loaded.source.target);
      }
      db.remove(loaded);
    }),
  ),
);
