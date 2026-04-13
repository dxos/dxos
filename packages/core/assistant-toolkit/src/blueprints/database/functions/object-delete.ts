//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { ObjectDelete } from './definitions';

export default ObjectDelete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const { db } = yield* Database.Service;
      const object = yield* Database.load(obj);
      db.remove(object);
    }),
  ),
);
