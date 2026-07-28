//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { Memory } from '../../../types/Memory';
import { DeleteMemory } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('DeleteMemory', () => {
  it.effect(
    'removes the memory from the database',
    Effect.fnUntraced(
      function* ({ expect }) {
        const memory = yield* Database.add(Obj.make(Memory, { title: 'Outdated fact', content: 'Stale.' }));
        const kept = yield* Database.add(Obj.make(Memory, { title: 'Current fact', content: 'Fresh.' }));
        yield* Database.flush();

        yield* Operation.invoke(DeleteMemory, { memory: Ref.make(memory) });

        const memories = yield* Database.query(Query.select(Filter.type(Memory))).run;
        expect(memories.map((entry) => entry.id)).toEqual([kept.id]);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
