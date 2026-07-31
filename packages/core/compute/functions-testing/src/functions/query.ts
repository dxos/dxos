//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Query as EchoQuery, Filter } from '@dxos/echo';

import { QueryDb } from './definitions';

export default QueryDb.pipe(
  Operation.withHandler(
    Effect.fn(function* (data) {
      const results = yield* Database.query(EchoQuery.select(Filter.everything())).run;
      return { count: results.length };
    }),
  ),
);
