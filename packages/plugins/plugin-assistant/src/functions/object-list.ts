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
  key: 'dxos.org/function/assistant/object-list',
  name: 'List objects',
  description:
    // TODO(wittjosiah): Find a better way to prompt for looking up typenames before querying with them.
    trim`
      Lists the objects of the given type.
      Check the get-schemas tool for available types before calling this function.
    `,
  inputSchema: Schema.Struct({
    typename: Schema.String.annotations({
      description: 'The typename of the objects to list.',
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
  handler: Effect.fn(function* ({ data: { typename } }) {
    // TODO(wittjosiah): Typename query is not working for dynamic schemas.
    const [schema] = yield* Database.Service.runSchemaQuery({ typename });
    const filter = schema ? Filter.type(schema) : Filter.typename(typename);

    const objects = yield* Database.Service.runQuery(Query.select(filter));
    const results = objects.map((object) => ({
      dxn: Obj.getDXN(object).toString(),
      label: Obj.getLabel(object),
    }));

    return { results };
  }),
});
