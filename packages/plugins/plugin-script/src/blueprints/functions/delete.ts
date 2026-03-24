//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Delete } from './definitions';

export default Delete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script }) {
      const { db } = yield* Database.Service;
      const object = yield* Database.load(script);
      db.remove(object);
    }),
  ),
);
