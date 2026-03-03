//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/object-delete',
  name: 'Delete object',
  description: trim`
    Deletes the object.
  `,
  inputSchema: Schema.Struct({
    obj: Type.Ref(Type.Obj),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { obj } }) {
    const { db } = yield* Database.Service;
    const object = yield* Database.load(obj);
    db.remove(object);
  }),
});
