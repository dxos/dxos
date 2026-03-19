//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { RelationDelete } from './definitions';

export default RelationDelete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ rel }) {
      const { db } = yield* Database.Service;
      const relation = yield* Database.load(rel);
      // TODO(dmaretskyi): Echo types broken.
      db.remove(relation as any);
    }),
  ),
);
