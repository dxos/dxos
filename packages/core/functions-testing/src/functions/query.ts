//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Filter, Query } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'example.org/function/query',
  name: 'Query',
  description: 'Queries the database',
  inputSchema: Schema.Any,
  outputSchema: Schema.Any,
  handler: Effect.fn(function* ({ data }) {
    const results = yield* Database.Service.runQuery(Query.select(Filter.everything()));
    return { count: results.length };
  }),
});
