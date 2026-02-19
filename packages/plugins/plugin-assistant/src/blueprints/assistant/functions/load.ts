//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Array from 'effect/Array';
import { Database, Entity, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/load',
  name: 'Load object',
  description: trim`
    Loads the object or relation content.
    Can load multiple objects at at time.
    Use the to read the data when you have a DXN.
    Call this tool with an array of one or more DXNs or object IDs.
    When use see a reference ({ '/': 'dxn:...' }), you can call this function to load the object.
    Note that returned data is only a snapshot in time, and might have changed since the object was last loaded.
  `,
  inputSchema: Schema.Struct({
    refs: Schema.Array(Type.Ref(Type.Obj)),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { refs } }) {
    return yield* Effect.forEach(refs, Database.load).pipe(Effect.map(Array.map(Entity.toJSON)));
  }),
});
