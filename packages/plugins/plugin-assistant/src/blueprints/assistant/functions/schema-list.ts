//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/schema-list',
  name: 'List schemas',
  description: trim`
    Lists schemas definitions.
  `,
  inputSchema: Schema.Struct({
    limit: Schema.optional(Schema.Number),
  }),
  outputSchema: Schema.Array(Schema.Unknown),
  handler: Effect.fn(function* () {
    const { db } = yield* Database.Service;
    const schema = yield* Effect.promise(() => db.schemaRegistry.query({ location: ['database', 'runtime'] }).run());
    return schema.map((schema) => {
      const meta = Type.getMeta(schema);
      return {
        typename: Type.getTypename(schema),
        jsonSchema: Type.toJsonSchema(schema),
        kind: meta?.sourceSchema ? 'relation' : 'record',
      };
    });
  }),
});
