//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity } from '@dxos/echo';

import { TagAdd } from './definitions';

export default TagAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tag, obj }) {
      const object = yield* Database.load(obj);
      Entity.update(object, (object) => Entity.addTag(object, tag));
      return Entity.toJSON(object);
    }),
  ),
);
