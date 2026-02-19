//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Entity, Filter, Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';
import { pipe, String } from 'effect';
import * as Array from 'effect/Array';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default defineFunction({
  key: 'dxos.org/function/assistant/query',
  name: 'List objects',
  description:
    // TODO(wittjosiah): Find a better way to prompt for looking up typenames before querying with them.
    trim`
      Query for objects in ECHO.
      Use this tool when searching for information in the space (both automerge and queues).
      Currently, two types of queries are supported:
        - Full-text search - terms may appear anywhere in the object.
        - Type-based search - objects of a specific type.
      You can use them together, for example, to search for objects of a specific type that match a full-text query.
      Important: Whem querying by typename, make sure to list the schema first, to get the exact typename.

      Omit both typename and text to search for all objects.

      <output_format>
        You can choose to either return the full object data, or just the DXN, type and label.
        When expecting a lot of results, run with includeContent=false to not pollute the context, and then load specific objects using the load tool.

        You can choose to get the content right away, if you don't expect a lot of results.
        To load content right away, run with includeContent=true.
        When loading content, set an appropriate limit on the number of results to avoid overwhelming the context.
      </output_format>

      <example description="All tasks related to Cyberdyne and Bob">
        {
          "typename": "dxos.org/type/Task",
          "text": "cyberdyne bob",
        }
      </example>

      <example description="Financial report Q1 2026">
        {
          "typename": "dxos.org/type/Document",
          "text": "financial report Q1 2026",
          "includeContent": true
          "limit": 3
        }
      </example>
    `,
  inputSchema: Schema.Struct({
    typename: Schema.optional(
      Schema.String.annotations({
        description: 'The typename of the objects to list.',
        example: 'dxos.org/type/Task',
      }),
    ),
    text: Schema.optional(
      Schema.String.annotations({
        description: 'Full text search query.',
        example: 'email cyberdyne bob',
      }),
    ),
    includeContent: Schema.optional(
      Schema.Boolean.annotations({
        description: 'Include the full object data in the response.',
        default: false,
      }),
    ),
    limit: Schema.optional(
      Schema.Number.annotations({
        description: 'The maximum number of results to return.',
        default: 10,
      }),
    ),
  }),
  outputSchema: Schema.Array(Schema.Unknown),
  handler: Effect.fn(function* ({ data: { typename, text, includeContent = false, limit = 10 } }) {
    let query: Query.Any;
    if (text) {
      query = Query.all(...text.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))));
      if (typename !== undefined) {
        query = query.select(Filter.type(typename));
      }
    } else if (typename) {
      query = Query.select(Filter.type(typename));
    } else {
      query = Query.select(Filter.everything());
    }
    query = query.limit(limit).options({ allQueuesFromSpaces: true });

    const results = yield* Database.runQuery(query);
    if (includeContent) {
      return results.map((obj) => Entity.toJSON(obj));
    } else {
      return results.map((obj) => ({
        dxn: Obj.getDXN(obj).toString(),
        typename: Obj.getTypename(obj),
        label: Obj.getLabel(obj),
      }));
    }
  }),
});
