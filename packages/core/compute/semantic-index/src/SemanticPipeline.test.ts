//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticIndexError } from './errors';
import { extractFacts, SemanticPipeline } from './SemanticPipeline';
import { SemanticStore } from './SemanticStore';
import { countingAiService, failingAiService, mockAiService, queuedAiService } from './testing';

const LLM_OUTPUT = {
  facts: [
    {
      subject: 'Alice',
      predicate: 'travelsTo',
      object: 'Paris',
      validFrom: '2026-06-12',
      factuality: 'PR+',
      polarity: '+',
      confidence: 0.6,
      nature: 'epistemic',
      quote: "I think I'm probably going to Paris next week",
    },
  ],
};

const TestLayer = SemanticStore.layer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
  Layer.provideMerge(mockAiService(LLM_OUTPUT)),
);

const FailingLayer = SemanticStore.layer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
  Layer.provideMerge(failingAiService()),
);

describe('SemanticPipeline', () => {
  it.effect(
    'extracts the Alice fact and persists it',
    Effect.fnUntraced(function* () {
      yield* SemanticPipeline.run([
        {
          text: "I think I'm probably going to Paris next week",
          source: 'dxn:q:m1',
          author: 'Alice',
          date: '2026-06-06T00:00:00.000Z',
        },
      ]);
      const store = yield* SemanticStore;
      const facts = yield* store.query({ predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length !== 1) {
          throw new Error(`expected 1 fact, got ${facts.length}`);
        }
        if (facts[0].valence.factuality !== 'PR+') {
          throw new Error('valence not extracted');
        }
        if (facts[0].attribution.source !== 'dxn:q:m1') {
          throw new Error('attribution source lost');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'surfaces a SemanticIndexError when extraction fails',
    Effect.fnUntraced(function* () {
      const error = yield* SemanticPipeline.run([{ text: 'anything', source: 'dxn:q:m1' }]).pipe(Effect.flip);
      yield* Effect.sync(() => {
        if (!(error instanceof SemanticIndexError)) {
          throw new Error(`expected SemanticIndexError, got ${String(error)}`);
        }
      });
    }, Effect.provide(FailingLayer)),
  );

  it.effect(
    'skips the LLM on unchanged re-ingest and re-runs on change',
    Effect.fnUntraced(function* () {
      const ai = countingAiService({
        facts: [{ subject: 'Alice', predicate: 'travelsTo', object: 'Paris', factuality: 'PR+', polarity: '+' }],
      });
      const layer = SemanticStore.layer.pipe(
        Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
        Layer.provideMerge(ai.layer),
      );
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const triplesCount = () =>
          sql<{ n: number }>`SELECT COUNT(*) AS n FROM triples`.pipe(Effect.map((rows) => rows[0].n));

        const doc = { text: 'going to Paris', source: 'dxn:q:m9', author: 'Alice', date: '2026-06-06T00:00:00.000Z' };
        yield* SemanticPipeline.run([doc]);
        const afterFirst = yield* triplesCount();
        yield* SemanticPipeline.run([doc]); // unchanged → skipped.
        const afterSecond = yield* triplesCount();
        yield* Effect.sync(() => {
          if (ai.calls() !== 1) {
            throw new Error(`expected 1 LLM call, got ${ai.calls()}`);
          }
          if (afterSecond !== afterFirst) {
            throw new Error(`unchanged re-ingest grew triples: ${afterFirst} -> ${afterSecond}`);
          }
        });

        yield* SemanticPipeline.run([{ ...doc, text: 'going to Rome instead' }]); // changed → re-extract.
        yield* Effect.sync(() => {
          if (ai.calls() !== 2) {
            throw new Error(`expected 2 LLM calls after change, got ${ai.calls()}`);
          }
        });
      }).pipe(Effect.provide(layer));
    }),
  );

  it.effect(
    'extractFacts derives facts with only an AiService (no store)',
    Effect.fnUntraced(
      function* () {
        // Layer provides ONLY AiService — no SemanticStore / SqlClient — proving derivation is store-free.
        const facts = yield* extractFacts([
          {
            text: "I think I'm probably going to Paris next week",
            source: 'editor:input',
            author: 'Alice',
            date: '2026-06-06T00:00:00.000Z',
          },
        ]);
        yield* Effect.sync(() => {
          if (facts.length !== 1) {
            throw new Error(`expected 1 fact, got ${facts.length}`);
          }
          const [fact] = facts;
          if (!('entity' in fact.assertion.subject) || fact.assertion.subject.entity !== 'alice') {
            throw new Error('subject not linked');
          }
          if (fact.assertion.predicate !== 'travelsTo') {
            throw new Error('predicate not extracted');
          }
          if (fact.valence.factuality !== 'PR+') {
            throw new Error('valence not extracted');
          }
          if (fact.attribution.source !== 'editor:input') {
            throw new Error('attribution source lost');
          }
        });
      },
      Effect.provide(queuedAiService([LLM_OUTPUT])),
    ),
  );
});
