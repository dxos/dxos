//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DXN, Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/object-delete',
  name: 'Delete object',
  description: trim`
    Deletes the object.
  `,
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the object.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { id } }) {
    const { db } = yield* Database.Service;
    const object = yield* Database.resolve(DXN.parse(id));
    db.remove(object);
  }),
});
