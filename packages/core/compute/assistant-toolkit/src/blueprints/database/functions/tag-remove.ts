//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Obj } from '@dxos/echo';

import { TagRemove } from './definitions';

export default TagRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tag, obj }) {
      const object = yield* Database.load(obj);
      const tagObj = yield* Database.load(tag);
      Entity.update(object, (object) => Entity.removeTag(object, Obj.getDXN(tagObj).toString()));
      return Entity.toJSON(object);
    }),
  ),
);
