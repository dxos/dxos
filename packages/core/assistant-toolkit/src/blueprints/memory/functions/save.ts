//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Memory } from '../../../types/Memory';
import { SaveMemory } from './definitions';

export default SaveMemory.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title, content }) {
      const memory = yield* Database.add(Obj.make(Memory, { title, content }));
      return Entity.toJSON(memory);
    }),
  ),
);
