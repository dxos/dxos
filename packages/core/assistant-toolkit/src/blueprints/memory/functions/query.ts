//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Filter, Query } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Memory } from '../../../types/Memory';

export default defineFunction({
  key: 'dxos.org/function/memory/query',
  name: 'Query memories',
  description:
    'Search for stored memories using full-text search. Returns memories matching the query terms. Use this to recall previously saved knowledge, facts, or preferences.',
  inputSchema: Schema.Struct({
    text: Schema.optional(
      Schema.String.annotations({
        description: 'Full-text search query. Omit to list all memories.',
        examples: ['new york trip date plan', 'favorite color', 'project cyberdyne'],
      }),
    ),
    limit: Schema.optional(
      Schema.Number.annotations({
        description: 'Maximum number of results to return.',
        default: 10,
      }),
    ),
  }),
  outputSchema: Schema.Array(Schema.Unknown),
  handler: Effect.fn(function* ({ data: { text, limit = 10 } }) {
    let query: Query.Any;
    if (text) {
      query = Query.all(
        // TODO(dmaretskyi): We should move this to the query executor layer.
        ...text.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))),
      ).select(Filter.type(Memory));
    } else {
      query = Query.select(Filter.type(Memory));
    }
    query = query.limit(limit);

    yield* Database.flush();
    const results = yield* Database.runQuery(query);
    return results.map((obj) => Entity.toJSON(obj));
  }),
});
