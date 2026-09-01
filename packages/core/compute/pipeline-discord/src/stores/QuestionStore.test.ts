//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { SqlTransaction } from '@dxos/sql-sqlite';

import * as QuestionStore from './QuestionStore.ts';

const suite = (name: string, layer: Layer.Layer<QuestionStore.QuestionStore>) =>
  describe(name, () => {
    it.effect(
      'adds and lists open questions',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore.QuestionStore;
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
        const store = yield* QuestionStore.QuestionStore;
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

    it.effect(
      'a duplicate id fails rather than replacing the stored question',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore.QuestionStore;
        yield* store.add('Who works on OPFS?', 'q-1');
        const result = yield* Effect.exit(store.add('Something else entirely?', 'q-1'));
        expect(Exit.isFailure(result)).toBe(true);
        expect((yield* store.get('q-1'))?.text).toBe('Who works on OPFS?');
      }, Effect.provide(layer)),
    );
  });

describe('QuestionStore', () => {
  suite('memory', QuestionStore.layerMemory);
  suite(
    'sql',
    QuestionStore.layerSql.pipe(
      Layer.provideMerge(SqlTransaction.layer),
      Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
    ),
  );
});
