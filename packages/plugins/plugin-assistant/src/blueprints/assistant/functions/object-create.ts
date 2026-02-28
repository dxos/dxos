//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/object-create',
  name: 'Create object',
  description: trim`
    Creates a new object and adds it to the current space.
    Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
  `,
  inputSchema: Schema.Struct({
    typename: Schema.String,
    data: Schema.Any,
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { typename, data } }) {
    const { db } = yield* Database.Service;
    const schema = yield* Effect.promise(() =>
      db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
    );
    invariant(Type.isObjectSchema(schema), 'Schema is not an object schema');

    const object = db.add(Obj.make(schema, data));
    return Entity.toJSON(object);
  }),
});
