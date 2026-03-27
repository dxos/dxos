//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TagAdd } from './definitions';

export default TagAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tag, obj }) {
      const object = yield* Database.load(obj);
      const tagObj = yield* Database.load(tag);
      Entity.change(object, (obj) => Entity.addTag(obj, Obj.getDXN(tagObj).toString()));
      return Entity.toJSON(object);
    }),
  ),
);
