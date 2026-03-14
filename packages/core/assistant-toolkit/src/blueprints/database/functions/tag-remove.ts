//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Entity, Obj, Ref, Tag } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'org.dxos.function.database.tag-remove',
  name: 'Remove tag',
  description: trim`
    Removes a tag from an object.
    Tags are objects of type ${Tag.Tag.typename}.
  `,
  inputSchema: Schema.Struct({
    tag: Ref.Ref(Obj.Unknown),
    obj: Ref.Ref(Obj.Unknown),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { tag, obj } }) {
    const object = yield* Database.load(obj);
    const tagObj = yield* Database.load(tag);
    Entity.change(object, (obj) => Entity.removeTag(obj, Obj.getDXN(tagObj).toString()));
    return Entity.toJSON(object);
  }),
});
