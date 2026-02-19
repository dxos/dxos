//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DXN, Database, Entity } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/object-update',
  name: 'Update object',
  description: trim`
    Updates the object properties.
  `,
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the object.',
    }),
    properties: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { id, properties } }) {
    const object = yield* Database.resolve(DXN.parse(id));
    Entity.change(object as Entity.Any, (obj) => {
      for (const [key, value] of Object.entries(properties)) {
        obj[key] = value;
      }
    });
    return Entity.toJSON(object);
  }),
});
