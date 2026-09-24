//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Query as EchoQuery, Filter } from '@dxos/echo';

import { QueryDb } from './definitions.ts';

export default QueryDb.pipe(
  Operation.withHandler(
    Effect.fn(function* (data) {
      const results = yield* Database.query(EchoQuery.select(Filter.everything())).run;
      return { count: results.length };
    }),
  ),
);
