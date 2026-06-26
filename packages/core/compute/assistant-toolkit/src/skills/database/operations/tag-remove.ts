//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity } from '@dxos/echo';

import { TagRemove } from './definitions';

export default TagRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tag, obj }) {
      const object = yield* Database.load(obj);
      Entity.update(object, (object) => Entity.removeTag(object, tag));
      return Entity.toJSON(object);
    }),
  ),
);
