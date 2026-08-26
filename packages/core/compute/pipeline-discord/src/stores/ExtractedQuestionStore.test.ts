//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { SqlTransaction } from '@dxos/sql-sqlite';

import * as ExtractedQuestionStore from './ExtractedQuestionStore';

const question = (
  over: Partial<ExtractedQuestionStore.ExtractedQuestion> = {},
): ExtractedQuestionStore.ExtractedQuestion => ({
  authorId: 'alice',
  targetId: 'chan-1',
  messageId: '1000',
  question: 'Should Composer use OPFS?',
  ...over,
});

const suite = (name: string, layer: Layer.Layer<ExtractedQuestionStore.ExtractedQuestionStore>) =>
  describe(name, () => {
    it.effect(
      'lists what was put, filtered by target',
      Effect.fnUntraced(function* () {
        const store = yield* ExtractedQuestionStore.ExtractedQuestionStore;
        yield* store.put(question());
        yield* store.put(question({ messageId: '1001', targetId: 'chan-2', question: 'Does it scale?' }));
        expect((yield* store.list()).length).toBe(2);
        expect((yield* store.list('chan-2')).map((extracted) => extracted.messageId)).toEqual(['1001']);
      }, Effect.provide(layer)),
    );

    it.effect(
      're-putting a (message, question) pair keeps the first record',
      Effect.fnUntraced(function* () {
        const store = yield* ExtractedQuestionStore.ExtractedQuestionStore;
        yield* store.put(question({ authorLabel: 'Alice' }));
        yield* store.put(question({ authorLabel: 'Alice (renamed)', targetId: 'chan-9' }));
        const listed = yield* store.list();
        expect(listed.length).toBe(1);
        expect(listed[0].authorLabel).toBe('Alice');
        expect(listed[0].targetId).toBe('chan-1');
      }, Effect.provide(layer)),
    );
  });

describe('ExtractedQuestionStore', () => {
  suite('memory', ExtractedQuestionStore.layerMemory);
  suite(
    'sql',
    ExtractedQuestionStore.layerSql.pipe(
      Layer.provideMerge(SqlTransaction.layer),
      Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
    ),
  );
});
