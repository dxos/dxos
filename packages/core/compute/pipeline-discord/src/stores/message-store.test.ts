//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { MessageStore, type StoredMessage } from './message-store';

const message = (id: string, over: Partial<StoredMessage> = {}): StoredMessage => ({
  id,
  targetId: 'chan-1',
  authorId: 'user-1',
  text: `hello ${id}`,
  raw: JSON.stringify({ id }),
  ...over,
});

const suite = (name: string, layer: Layer.Layer<MessageStore>) =>
  describe(name, () => {
    it.effect(
      'puts, gets, and counts messages',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1000', { createdAt: '2026-06-01T10:00:00.000Z', parentId: '999' }));
        expect(yield* store.has('1000')).toBe(true);
        expect(yield* store.has('missing')).toBe(false);
        const stored = yield* store.get('1000');
        expect(stored?.text).toBe('hello 1000');
        expect(stored?.parentId).toBe('999');
        expect(yield* store.count()).toBe(1);
      }, Effect.provide(layer)),
    );

    it.effect(
      'put is an idempotent upsert keyed on id',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1000'));
        yield* store.put(message('1000', { text: 'revised' }));
        expect(yield* store.count()).toBe(1);
        expect((yield* store.get('1000'))?.text).toBe('revised');
      }, Effect.provide(layer)),
    );

    it.effect(
      'lists a target chronologically (by id) with an optional limit',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1001'));
        yield* store.put(message('1000'));
        yield* store.put(message('2000', { targetId: 'thread-1' }));
        const listed = yield* store.listByTarget('chan-1');
        expect(listed.map((entry) => entry.id)).toEqual(['1000', '1001']);
        const limited = yield* store.listByTarget('chan-1', { limit: 1 });
        expect(limited.map((entry) => entry.id)).toEqual(['1000']);
      }, Effect.provide(layer)),
    );
  });

describe('MessageStore', () => {
  suite('memory', MessageStore.layerMemory);
  suite('sql', MessageStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie))));
});
