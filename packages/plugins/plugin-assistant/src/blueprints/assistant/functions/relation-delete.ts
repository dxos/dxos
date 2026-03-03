//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/relation-delete',
  name: 'Delete relation',
  description: trim`
    Deletes the relation.
  `,
  inputSchema: Schema.Struct({
    rel: Type.Ref(Type.Relation),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { rel } }) {
    const { db } = yield* Database.Service;
    const relation = yield* Database.load(rel);
    // TODO(dmaretskyi): Echo types broken.
    db.remove(relation as any);
  }),
});
