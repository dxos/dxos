//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { Database } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type RDF } from '@dxos/pipeline-rdf';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';
import * as BrainService from '@dxos/plugin-agent/BrainService';

import { queryCompactFacts } from './query-facts.ts';
import { summarizeSubject } from './summarize-subject.ts';
import { AGENT_TYPES, addAgent, brainWithFacts } from './testing.ts';

const makeFact = (options: {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
}): RDF.Fact => ({
  id: options.id,
  assertion: {
    subject: { kind: 'entity', entity: options.subject, label: options.subject },
    predicate: options.predicate,
    object: { kind: 'entity', entity: options.object, label: options.object },
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

/** Stub `AiService` whose `generateText` echoes a canned response (summaries are not LLM-tested here). */
const textAiService = (text: string): Layer.Layer<AiService.AiService> =>
  Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () =>
        Layer.succeed(LanguageModel.LanguageModel, {
          generateText: () => Effect.succeed({ text, content: [] }),
          generateObject: () => Effect.succeed({ value: {}, content: [] }),
          streamText: () => Stream.empty,
          // Test stub: the LanguageModel surface is wider than the three methods exercised here.
        } as any),
    }),
  );

let builder: EchoTestBuilder;
let db: Database.Database;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
  ({ db } = await builder.createDatabase({ types: AGENT_TYPES }));
});

afterEach(async () => {
  await builder.close();
});

/** The facts in the brain of the space's one agent, with the database the query reads the agents from. */
const seeded = () => Layer.provideMerge(brainWithFacts(FACTS), Database.layer(db));

describe('QueryFacts', () => {
  test('filters by entity across subject and object positions', async ({ expect }) => {
    const facts = await EffectEx.runPromise(queryCompactFacts({ entity: 'acme' }).pipe(Effect.provide(seeded())));
    expect(facts.map((fact) => fact.id).sort()).toEqual(['f-1', 'f-3']);
    // `works-at` is the seeded `schema:worksFor`, read back under its label.
    expect(facts[0]).toMatchObject({ subject: 'alice', predicate: 'works for', object: 'acme', factuality: 'CT+' });
  });

  test('applies minConfidence and limit bounds', async ({ expect }) => {
    const { confident, bounded } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const confident = yield* queryCompactFacts({ entity: 'alice', minConfidence: 0.9 });
        const bounded = yield* queryCompactFacts({ limit: 1 });
        return { confident, bounded };
      }).pipe(Effect.provide(seeded())),
    );
    expect(confident.map((fact) => fact.id)).toEqual(['f-1']);
    expect(bounded).toHaveLength(1);
  });

  test("reads every agent's brain, each fact once", async ({ expect }) => {
    const { service } = BrainMemory.makeDetached();
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* addAgent(service, FACTS.slice(0, 2));
        yield* addAgent(service, FACTS.slice(1));
        return yield* queryCompactFacts({});
      }).pipe(
        Effect.provide(Layer.provideMerge(Layer.succeed(BrainService.BrainService, service), Database.layer(db))),
      ),
    );
    expect(facts.map((fact) => fact.id).sort()).toEqual(['f-1', 'f-2', 'f-3']);
  });
});

describe('SummarizeSubject', () => {
  test('grounds the summary on matched facts and reports factCount', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      summarizeSubject({ subject: 'Alice' }).pipe(
        Effect.provide(Layer.merge(seeded(), textAiService('Alice works at Acme [f-1].'))),
      ),
    );
    expect(result.factCount).toBe(2);
    expect(result.summary).toContain('[f-1]');
    // Fact→source bridge: distinct source message DXNs for the matched facts.
    expect(result.sources.length).toBeGreaterThan(0);
    expect(new Set(result.sources).size).toBe(result.sources.length);
  });

  test('returns empty summary without invoking the LLM when no facts match', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      summarizeSubject({ subject: 'nobody' }).pipe(
        Effect.provide(
          Layer.merge(
            seeded(),
            Layer.succeed(
              AiService.AiService,
              AiService.make({
                languageModel: () => {
                  throw new Error('LLM must not be invoked');
                },
              }),
            ),
          ),
        ),
      ),
    );
    expect(result).toEqual({ summary: '', factCount: 0, sources: [] });
  });
});
