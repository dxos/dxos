//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { EntityId, SpaceId } from '@dxos/keys';

import { ObjectStore } from './object-store.ts';
import { type EntityRecord } from './record.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);

const TYPE = 'dxn:type:org.dxos.test.task:0.1.0';

const record = (id: string, title: string): EntityRecord => ({
  id,
  kind: 'object',
  typeDxn: TYPE,
  deleted: false,
  parentId: null,
  sourceId: null,
  targetId: null,
  body: { id, '@type': TYPE, title },
  refs: [],
  text: title,
});

describe('ObjectStore', () => {
  it.effect('a rolled-back transaction leaves no cached document ahead of the file', () =>
    Effect.gen(function* () {
      const store = yield* ObjectStore.open(SpaceId.random());
      const id = EntityId.random();
      yield* store.write([record(id, 'first')]);

      // The document cache takes the second write before the transaction fails.
      const failed = yield* Effect.flip(
        store.transaction(
          Effect.gen(function* () {
            yield* store.write([record(id, 'second')]);
            return yield* Effect.fail('abort' as const);
          }),
        ),
      );
      expect(failed).toBe('abort');
      expect((yield* store.load(id))?.body.title).toBe('first');

      // A stale cache would find nothing new and append no change.
      yield* store.write([record(id, 'second')]);
      expect((yield* store.load(id))?.body.title).toBe('second');
    }).pipe(Effect.provide(TestLayer)),
  );
});
