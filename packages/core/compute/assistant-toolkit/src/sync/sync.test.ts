//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { syncObjects } from './sync';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({ types: [Text.Text], disableLlmMemoization: true });

const SOURCE = 'test.source';

/** Detached object carrying the foreign key `syncObjects` matches on. */
const makeIncoming = (id: string, content: string) => {
  const obj = Obj.make(Text.Text, { content });
  Obj.update(obj, (obj) => {
    Obj.getMeta(obj).keys.push({ source: SOURCE, id });
  });
  return obj;
};

describe('syncObjects', () => {
  it.effect(
    'adds an object with no foreign-key match',
    Effect.fnUntraced(
      function* (_) {
        const [synced] = yield* syncObjects([makeIncoming('a', 'first')], { foreignKeyId: SOURCE });
        yield* Database.flush();

        const all = yield* Database.query(Filter.type(Text.Text)).run;
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe(synced.id);
        expect(Obj.getKeys(synced, SOURCE)).toEqual([{ source: SOURCE, id: 'a' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'updates the matching object in place rather than adding a second',
    Effect.fnUntraced(
      function* (_) {
        const [first] = yield* syncObjects([makeIncoming('a', 'first')], { foreignKeyId: SOURCE });
        yield* Database.flush();

        const [second] = yield* syncObjects([makeIncoming('a', 'updated')], { foreignKeyId: SOURCE });
        yield* Database.flush();

        expect(second.id).toBe(first.id);

        // Queried rather than read off the returned `Obj.Unknown`, which would need a cast.
        const all = yield* Database.query(Query.select(Filter.type(Text.Text))).run;
        expect(all).toHaveLength(1);
        expect(all[0].content).toBe('updated');

        // The foreign key survives the copy: it is read off a detached object, so it reaches the
        // persisted object only because assignment copies nested records by value.
        expect(Obj.getKeys(second, SOURCE)).toEqual([{ source: SOURCE, id: 'a' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'replaces keys from the same source, leaving other sources intact',
    Effect.fnUntraced(
      function* (_) {
        const [existing] = yield* syncObjects([makeIncoming('a', 'first')], { foreignKeyId: SOURCE });
        Obj.update(existing, (existing) => {
          Obj.getMeta(existing).keys.push({ source: 'other', id: 'keep-me' });
        });
        yield* Database.flush();

        yield* syncObjects([makeIncoming('a', 'updated')], { foreignKeyId: SOURCE });
        yield* Database.flush();

        expect(Obj.getKeys(existing, SOURCE)).toEqual([{ source: SOURCE, id: 'a' }]);
        expect(Obj.getKeys(existing, 'other')).toEqual([{ source: 'other', id: 'keep-me' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
