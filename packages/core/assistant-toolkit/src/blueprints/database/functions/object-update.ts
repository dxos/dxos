//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';
import { EncodedReference } from '@dxos/echo-protocol';

export default defineFunction({
  key: 'org.dxos.function.database.object-update',
  name: 'Update object',
  description: trim`
    Updates the object properties.
    References are provided in the following format: { "/": "dxn:..." }.
    Reference examples: { "/": "dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }, { "/": "dxn:queue:data:01KG7R1ZXWFMWQ4DA1Q6TN1DG4:01KG7R1ZXWFMWQ4DA1Q6TN1DG4" }
  `,
  inputSchema: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown),
    properties: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { obj, properties } }) {
    const { db } = yield* Database.Service;
    const object = yield* Database.load(obj);
    Entity.change(object as Entity.Any, (obj) => {
      for (const [key, value] of Object.entries(properties)) {
        if (EncodedReference.isEncodedReference(value)) {
          obj[key] = db.makeRef(EncodedReference.toDXN(value));
        } else {
          obj[key] = value;
        }
      }
    });
    return Entity.toJSON(object);
  }),
});
