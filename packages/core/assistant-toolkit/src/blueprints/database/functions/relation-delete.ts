//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { RelationDelete } from './definitions';

const handler: Operation.WithHandler<Operation.Definition.Any> = RelationDelete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ rel }) {
      const { db } = yield* Database.Service;
      const relation = yield* Database.load(rel);
      // TODO(dmaretskyi): Echo types broken.
      db.remove(relation as any);
    }),
  ),
);

export default handler;
