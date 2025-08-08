//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { Filter, Obj, Query } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

// TODO(burdon): Factor out to space plugin.
export default defineFunction({
  name: 'dxos.org/function/assistant/list',
  description:
    // TODO(wittjosiah): Find a better way to prompt for looking up typenames before querying with them.
    trim`
      Lists the objects of the given type.
      Check the list-schemas tool for available types before calling this function.
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
    const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.typename(typename)));
    const results = objects.map((object) => ({
      dxn: Obj.getDXN(object).toString(),
      label: Obj.getLabel(object),
    }));

    return { results };
  }),
});
