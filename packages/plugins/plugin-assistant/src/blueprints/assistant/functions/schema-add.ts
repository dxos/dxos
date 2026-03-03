//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/schema-add',
  name: 'Add schema',
  description: trim`
    Adds a schema to the space.
    The name will be used when displayed to the user.
  `,
  inputSchema: Schema.Struct({
    name: Schema.String,
    typename: Schema.String.annotations({
      description: 'The typename of the schema in the format of "example.com/type/Type".',
    }),
    jsonSchema: Schema.Any,
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { name, typename, jsonSchema } }) {
    const { db } = yield* Database.Service;
    yield* Effect.promise(() =>
      db.schemaRegistry.register([
        {
          typename,
          version: '0.1.0',
          jsonSchema,
          name,
        },
      ]),
    );
  }),
});
