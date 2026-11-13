//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, FactStoreLive, RDF } from '@dxos/pipeline-rdf';

import { queryResolvedFacts } from './facts.ts';
import { queryCompactFacts } from './query-facts.ts';
import { summarizeSubject } from './summarize-subject.ts';

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

const seededStore = Effect.gen(function* () {
  const store = yield* FactStore;
  yield* store.putFacts(FACTS);
  return store;
});

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

describe('QueryFacts', () => {
  test('filters by entity across subject and object positions', async ({ expect }) => {
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        return yield* queryCompactFacts({ entity: 'acme' });
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(facts.map((fact) => fact.id).sort()).toEqual(['f-1', 'f-3']);
    // `works-at` is the seeded `schema:worksFor`, read back under its label.
    expect(facts[0]).toMatchObject({ subject: 'alice', predicate: 'works for', object: 'acme', factuality: 'CT+' });
  });

  test('applies minConfidence and limit bounds', async ({ expect }) => {
    const { confident, bounded } = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        const confident = yield* queryCompactFacts({ entity: 'alice', minConfidence: 0.9 });
        const bounded = yield* queryCompactFacts({ limit: 1 });
        return { confident, bounded };
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(confident.map((fact) => fact.id)).toEqual(['f-1']);
    expect(bounded).toHaveLength(1);
  });
});

/** A user with an IRI of its own (as the Discord pipeline names them), known by a display name, not a slug. */
const DISCORD_USER = 'https://discord.com/users/1234';
const DISCORD_FACTS: RDF.Fact[] = [
  {
    ...makeFact({ id: 'd-1', subject: 'x', predicate: 'works on', object: 'opfs' }),
    assertion: {
      subject: { kind: 'entity', entity: DISCORD_USER, label: 'dmaretskyi' },
      predicate: 'works on',
      object: { kind: 'entity', entity: 'opfs', label: 'OPFS' },
    },
  },
  {
    ...makeFact({ id: 'd-2', subject: 'x', predicate: 'reviews', object: 'x' }),
    assertion: {
      subject: { kind: 'entity', entity: 'alice', label: 'Alice' },
      predicate: 'reviews',
      object: { kind: 'entity', entity: DISCORD_USER, label: 'dmaretskyi' },
    },
  },
];

describe('entity names', () => {
  test('finds an entity with an IRI of its own by its label, in either position', async ({ expect }) => {
    const { byLabel, bySubject, byIri } = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([...FACTS, ...DISCORD_FACTS]);
        return {
          byLabel: yield* queryCompactFacts({ entity: 'dmaretskyi' }),
          bySubject: yield* queryCompactFacts({ subjectEntity: 'DMaretskyi' }),
          byIri: yield* queryCompactFacts({ entity: DISCORD_USER }),
        };
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(byLabel.map((fact) => fact.id).sort()).toEqual(['d-1', 'd-2']);
    expect(bySubject.map((fact) => fact.id)).toEqual(['d-1']);
    expect(byIri.map((fact) => fact.id).sort()).toEqual(['d-1', 'd-2']);
  });

  test('finds an entity by an absolute IRI of any scheme, with no label to match', async ({ expect }) => {
    const did = 'did:key:z6MkAlice';
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([
          {
            ...makeFact({ id: 'k-1', subject: 'x', predicate: 'works on', object: 'x' }),
            assertion: {
              subject: { kind: 'entity', entity: did },
              predicate: 'works on',
              object: { kind: 'entity', entity: 'opfs', label: 'OPFS' },
            },
          },
        ]);
        return yield* queryCompactFacts({ entity: did });
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(facts.map((fact) => fact.id)).toEqual(['k-1']);
  });

  test('leaves out a graph another result supersedes', async ({ expect }) => {
    const [old] = RDF.Graph.assign([
      {
        ...makeFact({ id: '', subject: 'x', predicate: 'has account', object: 'x' }),
        assertion: {
          subject: { kind: 'entity', entity: DISCORD_USER, label: 'dmaretskyi' },
          predicate: 'has account',
          object: { kind: 'literal', literal: 'old_name' },
        },
      },
    ]);
    const [current] = RDF.Graph.assign([
      {
        ...old,
        id: '',
        graph: undefined,
        supersedes: [RDF.Mapping.graphOf(old)],
        assertion: { ...old.assertion, object: { kind: 'literal', literal: 'new_name' } },
      },
    ]);
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([old, current]);
        return yield* queryResolvedFacts({ entity: DISCORD_USER });
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(facts.map((fact) => fact.assertion.object)).toEqual([{ kind: 'literal', literal: 'new_name' }]);
  });

  test('leaves out a superseded graph even when its replacement does not match the query', async ({ expect }) => {
    const statement = (object: string, supersedes?: string): RDF.Fact => ({
      ...makeFact({ id: '', subject: 'alice', predicate: 'works for', object }),
      ...(supersedes ? { supersedes: [supersedes] } : {}),
    });
    const [acme] = RDF.Graph.assign([statement('acme')]);
    const [contoso] = RDF.Graph.assign([statement('contoso', RDF.Mapping.graphOf(acme))]);
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([acme, contoso]);
        return yield* queryResolvedFacts({ entity: 'acme' });
      }).pipe(Effect.provide(FactStoreLive.layerMemory)),
    );
    expect(facts).toEqual([]);
  });

  test('summarizes a subject named by its label', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([...FACTS, ...DISCORD_FACTS]);
        return yield* summarizeSubject({ subject: 'dmaretskyi' });
      }).pipe(Effect.provide(Layer.provideMerge(FactStoreLive.layerMemory, textAiService('Works on OPFS [d-1].')))),
    );
    expect(result.factCount).toBe(2);
  });
});

describe('SummarizeSubject', () => {
  test('grounds the summary on matched facts and reports factCount', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* seededStore;
        return yield* summarizeSubject({ subject: 'Alice' });
      }).pipe(
        Effect.provide(Layer.provideMerge(FactStoreLive.layerMemory, textAiService('Alice works at Acme [f-1].'))),
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
      Effect.gen(function* () {
        yield* seededStore;
        return yield* summarizeSubject({ subject: 'nobody' });
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            FactStoreLive.layerMemory,
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
