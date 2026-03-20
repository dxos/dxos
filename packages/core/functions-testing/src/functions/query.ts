//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Query as EchoQuery } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { QueryDb } from './definitions';

export default QueryDb.pipe(
  Operation.withHandler(
    Effect.fn(function* (data) {
      const results = yield* Database.runQuery(EchoQuery.select(Filter.everything()));
      return { count: results.length };
    }),
  ),
);
