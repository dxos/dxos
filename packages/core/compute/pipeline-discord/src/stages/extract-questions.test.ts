//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { type Type } from '@dxos/crawler';
import { type Fact } from '@dxos/echo-memory';
import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import { DiscordPipeline } from '../pipeline.ts';
import { replayStream } from '../replay.ts';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from '../testing/index.ts';
import { detectQuestions, extractQuestionsStage } from './extract-questions.ts';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const TestLayer = Layer.mergeAll(
  storesLayer(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
  fixtureSourceLayer(THREADED_FIXTURE),
  deterministicAiService(),
);

describe('detectQuestions', () => {
  it.effect(
    'finds question sentences and ignores statements',
    Effect.fnUntraced(function* () {
      expect(detectQuestions('Should Composer use OPFS for local storage?')).toEqual([
        'Should Composer use OPFS for local storage?',
      ]);
      expect(detectQuestions('It works. Does it scale? Yes it does.')).toEqual(['Does it scale?']);
      expect(detectQuestions('No questions here.')).toEqual([]);
      // Too short to be a real question.
      expect(detectQuestions('eh?')).toEqual([]);
    }),
  );
});

describe('extractQuestionsStage', () => {
  it.effect(
    'records each question in the fact store around an anonymous question node',
    Effect.fnUntraced(function* () {
      yield* DiscordPipeline.run(CONFIG);
      const facts = yield* FactStore;
      const questionGraph = (all: readonly Fact.Fact[]) =>
        all.filter((fact) => fact.extractor.id === 'extract-questions');

      const recorded = questionGraph(yield* facts.query({ source: 'discord:1000' }));
      expect(recorded).toHaveLength(3);
      expect(new Set(recorded.map((fact) => fact.graph)).size).toBe(1);
      expect(recorded.every((fact) => fact.attribution.agent === 'https://discord.com/users/Alice')).toBe(true);
      expect(recorded.find((fact) => fact.assertion.predicate === 'asked')?.assertion).toMatchObject({
        subject: { kind: 'entity', entity: 'https://discord.com/users/Alice' },
        object: { kind: 'entity', entity: 'question', label: 'Should Composer use OPFS for local storage?' },
      });
      expect(recorded.find((fact) => fact.assertion.predicate === 'has text')?.assertion.object).toEqual({
        kind: 'literal',
        literal: 'Should Composer use OPFS for local storage?',
      });
      expect(recorded.find((fact) => fact.assertion.predicate === 'is a')?.assertion.object).toMatchObject({
        entity: 'https://schema.org/Question',
      });

      // `asked` is a seed predicate, so a predicate query finds every question.
      expect(questionGraph(yield* facts.query({ predicate: 'asked' }))).toHaveLength(1);

      // A replay writes the same graph rather than a second copy.
      yield* replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
      expect(questionGraph(yield* facts.query({ source: 'discord:1000' }))).toHaveLength(3);
    }, Effect.provide(TestLayer)),
  );
});
