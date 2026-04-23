//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TagRemove } from './definitions';

export default TagRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tag, obj }) {
      const object = yield* Database.load(obj);
      const tagObj = yield* Database.load(tag);
      Entity.change(object, (object) => Entity.removeTag(object, Obj.getDXN(tagObj).toString()));
      return Entity.toJSON(object);
    }),
  ),
);
