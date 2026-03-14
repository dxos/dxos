//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'org.dxos.function.database.object-update',
  name: 'Update object',
  description: trim`
    Updates the object properties.
  `,
  inputSchema: Schema.Struct({
    obj: Ref.Ref(Obj.Unknown),
    properties: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { obj, properties } }) {
    const object = yield* Database.load(obj);
    Entity.change(object as Entity.Any, (obj) => {
      for (const [key, value] of Object.entries(properties)) {
        obj[key] = value;
      }
    });
    return Entity.toJSON(object);
  }),
});
