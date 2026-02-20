//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Filter, Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default defineFunction({
  key: 'dxos.org/function/assistant/object-search',
  name: 'Search objects',
  description:
    // TODO(wittjosiah): Find a better way to prompt for looking up typenames before querying with them.
    trim`
      Searches the objects using full-text search.
    `,
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),
  }),
  outputSchema: Schema.Struct({
    results: Schema.Array(
      Schema.Struct({
        dxn: Schema.String.annotations({ description: 'The DXN of the object.' }),
        label: Schema.optional(Schema.String.annotations({ description: 'The label of the object.' })),
      }),
    ),
  }),
  handler: Effect.fn(function* ({ data: { query } }) {
    const objects = yield* Database.runQuery(
      Query.select(Filter.text(query, { type: 'full-text' })).options({ allQueuesFromSpaces: true }),
    );
    const results = objects.map((object) => ({
      dxn: Obj.getDXN(object).toString(),
      label: Obj.getLabel(object),
    }));

    return { results };
  }),
});
