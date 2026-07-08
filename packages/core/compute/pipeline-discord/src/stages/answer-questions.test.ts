//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { AiService } from '@dxos/ai';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';

import { QuestionStore } from '../stores';
import { answerOpenQuestions } from './answer-questions';

const fact = (id: string): RDF.Fact => ({
  id,
  assertion: { subject: { entity: 'carol' }, predicate: 'works on', object: { entity: 'opfs' } },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  attribution: { agent: 'carol', source: `discord:${id}`, generatedAtTime: '2026-06-01T00:00:00.000Z' },
  recordedAt: '2026-06-01T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
});

/**
 * Routes the two LLM calls the answer path makes: the query-generation prompt returns an
 * unconstrained query (match everything), the answer prompt returns the canned answer.
 */
const fakeAi = (answer?: string): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    // The @effect/ai LanguageModel surface is large and external; this test fake fills only the
    // methods the answer path calls.
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: (request: { prompt: string }) =>
          Effect.succeed({
            value: request.prompt.includes('Answer the question') ? (answer ? { answer } : {}) : {},
            content: [],
          }),
        streamText: () => Stream.empty,
      } as any),
  });

const TestLayer = (answer?: string) => Layer.mergeAll(QuestionStore.layerMemory, FactStore.layerMemory, fakeAi(answer));

describe('answerOpenQuestions', () => {
  it.effect(
    'answers an open question from matching facts with citations',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        const facts = yield* FactStore;
        yield* facts.putFacts([fact('f1'), fact('f2')]);
        yield* questions.add('Who works on OPFS?', 'q-1');

        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(1);

        const question = yield* questions.get('q-1');
        expect(question?.status).toBe('answered');
        expect(question?.answer).toBe('Carol works on OPFS.');
        expect(question?.supportingIds).toEqual(['f1', 'f2']);
      },
      Effect.provide(TestLayer('Carol works on OPFS.')),
    ),
  );

  it.effect(
    'leaves a question open when there are no facts',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        yield* questions.add('Who works on OPFS?', 'q-1');
        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(0);
        expect((yield* questions.get('q-1'))?.status).toBe('open');
      },
      Effect.provide(TestLayer('unused')),
    ),
  );

  it.effect(
    'leaves a question open when the model declines to answer',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        const facts = yield* FactStore;
        yield* facts.putFacts([fact('f1')]);
        yield* questions.add('Who works on OPFS?', 'q-1');
        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(0);
        expect((yield* questions.get('q-1'))?.status).toBe('open');
      },
      Effect.provide(TestLayer(undefined)),
    ),
  );
});
