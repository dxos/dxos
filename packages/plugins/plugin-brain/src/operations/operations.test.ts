//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { EffectEx } from '@dxos/effect';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';

import { queryCompactFacts } from './query-facts';
import { summarizeSubject } from './summarize-subject';

const makeFact = (options: {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
}): RDF.Fact => ({
  id: options.id,
  assertion: {
    subject: { entity: options.subject, label: options.subject },
    predicate: options.predicate,
    object: { entity: options.object, label: options.object },
  },
  factuality: { value: 'CT+', polarity: '+', confidence: options.confidence ?? 0.9, nature: 'epistemic' },
  attribution: {
    source: 'dxn:echo:@:message-1',
    generatedAtTime: '2026-07-01T00:00:00.000Z',
  },
  recordedAt: '2026-07-01T12:00:00.000Z',
  extractor: { id: 'test', model: 'stub', version: '1' },
  sourceHash: 'hash-1',
});

const FACTS: RDF.Fact[] = [
  makeFact({ id: 'f-1', subject: 'alice', predicate: 'works-at', object: 'acme', confidence: 0.95 }),
  makeFact({ id: 'f-2', subject: 'alice', predicate: 'travels-to', object: 'paris', confidence: 0.5 }),
  makeFact({ id: 'f-3', subject: 'bob', predicate: 'works-at', object: 'acme', confidence: 0.8 }),
];

const seededStore = Effect.gen(function* () {
  const store = yield* FactStore;
  yield* store.putFacts(FACTS);
  return store;
});

/** Stub `AiService` whose `generateText` echoes a canned response (summaries are not LLM-tested here). */
const textAiService = (text: string): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text, content: [] }),
        generateObject: () => Effect.succeed({ value: {}, content: [] }),
        streamText: () => Stream.empty,
        // Test stub: the LanguageModel surface is wider than the three methods exercised here.
      } as any),
  });

describe('QueryFacts', () => {
  test('filters by entity across subject and object positions', async ({ expect }) => {
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        return yield* queryCompactFacts({ entity: 'acme' });
      }).pipe(Effect.provide(FactStore.layerMemory)),
    );
    expect(facts.map((fact) => fact.id).sort()).toEqual(['f-1', 'f-3']);
    expect(facts[0]).toMatchObject({ subject: 'alice', predicate: 'works-at', object: 'acme', factuality: 'CT+' });
  });

  test('applies minConfidence and limit bounds', async ({ expect }) => {
    const { confident, bounded } = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        const confident = yield* queryCompactFacts({ entity: 'alice', minConfidence: 0.9 });
        const bounded = yield* queryCompactFacts({ limit: 1 });
        return { confident, bounded };
      }).pipe(Effect.provide(FactStore.layerMemory)),
    );
    expect(confident.map((fact) => fact.id)).toEqual(['f-1']);
    expect(bounded).toHaveLength(1);
  });
});

describe('SummarizeSubject', () => {
  test('grounds the summary on matched facts and reports factCount', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        return yield* summarizeSubject({ subject: 'Alice' });
      }).pipe(Effect.provide(FactStore.layerMemory), Effect.provide(textAiService('Alice works at Acme [f-1].'))),
    );
    expect(result.factCount).toBe(2);
    expect(result.summary).toContain('[f-1]');
  });

  test('returns empty summary without invoking the LLM when no facts match', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        return yield* summarizeSubject({ subject: 'nobody' });
      }).pipe(
        Effect.provide(FactStore.layerMemory),
        // A dying stub proves the LLM path is never reached for an ungrounded subject.
        Effect.provide(
          Layer.succeed(AiService.AiService, {
            model: () => {
              throw new Error('LLM must not be invoked');
            },
          }),
        ),
      ),
    );
    expect(result).toEqual({ summary: '', factCount: 0 });
  });
});
