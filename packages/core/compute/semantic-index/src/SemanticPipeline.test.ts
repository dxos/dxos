//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticIndexError } from './errors';
import { SemanticPipeline } from './SemanticPipeline';
import { SemanticStore } from './SemanticStore';
import { failingAiService, mockAiService } from './testing';

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
});
