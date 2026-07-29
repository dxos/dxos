//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { Memory } from '../../../types/Memory';
import { QueryMemories } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('QueryMemories', () => {
  it.effect(
    'lists every memory when no text is given',
    Effect.fnUntraced(
      function* (_) {
        yield* seed();

        const results = yield* Operation.invoke(QueryMemories, {});

        expect((yield* titles(results)).sort()).toEqual(['Favourite colour', 'Favourite language']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'narrows to the memories matching the search text',
    Effect.fnUntraced(
      function* (_) {
        yield* seed();

        const results = yield* Operation.invoke(QueryMemories, { text: 'colour' });

        expect(yield* titles(results)).toEqual(['Favourite colour']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'caps the result count at the given limit',
    Effect.fnUntraced(
      function* (_) {
        yield* seed();

        const results = yield* Operation.invoke(QueryMemories, { limit: 1 });

        expect(results).toHaveLength(1);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

const titles = (results: readonly unknown[]) =>
  Schema.decodeUnknown(Schema.Array(Schema.Struct({ title: Schema.String })))(results).pipe(
    Effect.map((rows) => rows.map((row) => row.title)),
  );

const seed = Effect.fnUntraced(function* () {
  yield* Database.add(Obj.make(Memory, { title: 'Favourite colour', content: 'The colour blue.' }));
  yield* Database.add(Obj.make(Memory, { title: 'Favourite language', content: 'TypeScript.' }));
  yield* Database.flush();
});
