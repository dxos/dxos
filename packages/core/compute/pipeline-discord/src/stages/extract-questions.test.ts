//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { type Type } from '@dxos/crawler';
import { Pipeline } from '@dxos/pipeline';

import { DiscordPipeline } from '../pipeline';
import { replayStream } from '../replay';
import { ExtractedQuestionStore } from '../stores';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from '../testing';
import { detectQuestions, extractQuestionsStage } from './extract-questions';

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
    'replay over a crawled store extracts user questions idempotently',
    Effect.fnUntraced(function* () {
      // First: the live crawl fills the message store (fixture channel + thread).
      yield* DiscordPipeline.run(CONFIG);

      // Then: replay the stored messages through the question-extraction assembly.
      const replay = replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
      yield* replay;

      const store = yield* ExtractedQuestionStore;
      const extracted = yield* store.list();
      // The fixture has exactly one interrogative message (Alice's OPFS question, id 1000).
      expect(extracted.length).toBe(1);
      expect(extracted[0]).toMatchObject({
        authorId: 'Alice',
        targetId: 'chan-1',
        messageId: '1000',
        question: 'Should Composer use OPFS for local storage?',
      });

      // Replaying again changes nothing (idempotent upsert).
      yield* replay;
      expect((yield* store.list()).length).toBe(1);
    }, Effect.provide(TestLayer)),
  );
});
