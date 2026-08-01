//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { QuestionStore } from './question-store';

const suite = (name: string, layer: Layer.Layer<QuestionStore>) =>
  describe(name, () => {
    it.effect(
      'adds and lists open questions',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore;
        const added = yield* store.add('Who works on OPFS?');
        expect(added.status).toBe('open');
        expect(added.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const open = yield* store.list('open');
        expect(open.map((question) => question.id)).toEqual([added.id]);
        expect(yield* store.list('answered')).toEqual([]);
      }, Effect.provide(layer)),
    );

    it.effect(
      'answering closes the question with supporting ids',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore;
        const added = yield* store.add('Who works on OPFS?', 'q-1');
        yield* store.answer('q-1', 'Carol and Alice.', ['fact-1', 'fact-2']);
        const answered = yield* store.get(added.id);
        expect(answered?.status).toBe('answered');
        expect(answered?.answer).toBe('Carol and Alice.');
        expect(answered?.supportingIds).toEqual(['fact-1', 'fact-2']);
        expect(yield* store.list('open')).toEqual([]);
        expect((yield* store.list()).length).toBe(1);
      }, Effect.provide(layer)),
    );
  });

describe('QuestionStore', () => {
  suite('memory', QuestionStore.layerMemory);
  suite(
    'sql',
    QuestionStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie))),
  );
});
