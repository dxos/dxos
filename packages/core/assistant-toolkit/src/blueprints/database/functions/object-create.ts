//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { deepMapValues, trim } from '@dxos/util';
import { EncodedReference } from '@dxos/echo-protocol';

export default defineFunction({
  key: 'org.dxos.function.database.object-create',
  name: 'Create object',
  description: trim`
    Creates a new object and adds it to the current space.
    Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
    References are provided in the following format: { "/": "dxn:..." }.
    Reference examples: { "/": "dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }, { "/": "dxn:queue:data:01KG7R1ZXWFMWQ4DA1Q6TN1DG4:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }
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

    const object = db.add(
      Obj.make(
        schema,
        deepMapValues(data, (value, recurse) => {
          if (EncodedReference.isEncodedReference(value)) {
            return db.makeRef(EncodedReference.toDXN(value));
          }
          return recurse(value);
        }),
      ),
    );
    return Entity.toJSON(object);
  }),
});
