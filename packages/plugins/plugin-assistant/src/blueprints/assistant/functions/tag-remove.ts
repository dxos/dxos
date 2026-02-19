//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DXN, Database, Entity, Tag } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/tag-remove',
  name: 'Remove tag',
  description: trim`
    Removes a tag from an object.
    Tags are objects of type ${Tag.Tag.typename}.
  `,
  inputSchema: Schema.Struct({
    tagId: ArtifactId.annotations({
      description: 'The ID of the tag.',
    }),
    objectId: ArtifactId.annotations({
      description: 'The ID of the object.',
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { tagId, objectId } }) {
    const object = yield* Database.resolve(DXN.parse(objectId));
    Entity.change(object, (obj) => Entity.removeTag(obj, DXN.parse(tagId).toString()));
    return Entity.toJSON(object);
  }),
});
