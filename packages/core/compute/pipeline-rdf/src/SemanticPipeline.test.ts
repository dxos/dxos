//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { readFileSync } from 'node:fs';

import { Pipeline } from '@dxos/pipeline';

import { SemanticIndexError } from './errors';
import {
  DEFAULT_EXTRACTION_RULES,
  type DocumentFacts,
  type ExtractDocument,
  SemanticPipeline,
  buildExtractionPrompt,
  extractFacts,
  extractFactsStage,
  indexFactsStage,
  normalizeEntityId,
  normalizeFactsStage,
} from './SemanticPipeline';
import { SemanticStore } from './SemanticStore';
import { countingAiService, failingAiService, mockAiService, queuedAiService } from './testing';
import { type Fact } from './types';

// Discord channel fixture (snapshot of `plugin-discord:generate-fixtures`) as extraction documents.
type FixtureMessage = {
  'id': string;
  'created'?: string;
  'sender'?: { name?: string };
  'blocks'?: Array<{ _tag: string; text?: string }>;
  '@meta'?: { keys?: Array<{ id?: string }> };
};

const loadDiscordDocs = (): ExtractDocument[] => {
  const { messages = [] }: { messages?: FixtureMessage[] } = JSON.parse(
    readFileSync(new URL('./testing/discord-messages.json', import.meta.url), 'utf8'),
  );
  return messages
    .map((message): ExtractDocument => {
      const text = (message.blocks ?? [])
        .filter((block) => block._tag === 'text' && block.text)
        .map((block) => block.text)
        .join('\n')
        .trim();
      const key = message['@meta']?.keys?.[0]?.id ?? message.id;
      return { text, source: `discord:${key}`, date: message.created, author: message.sender?.name };
    })
    .filter((doc) => doc.text.length > 0);
};

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
  it('composes extraction rules, appending caller rules after the defaults', ({ expect }) => {
    const prompt = buildExtractionPrompt();
    // The default set rejects questions (the immediate case driving this rule).
    expect(prompt).toContain('Do not extract facts from questions');
    // Class membership uses the distinguished `is-a` predicate (rdf:type-like), never bare "is"/"was".
    expect(prompt).toContain('Use the exact predicate "is-a" for class membership');
    // Predicates are atemporal: tense flows into valid-time, and past tense alone does not end a fact.
    expect(prompt).toContain('timeless present form');
    expect(prompt).toContain('does NOT set validTo');
    expect(prompt).not.toContain('predicate "was created by"');
    // Anti-synonym bias: the model reuses predicates rather than inventing variants.
    expect(prompt).toContain('reuse the SAME predicate');

    const extended = buildExtractionPrompt({ rules: ['Treat @handles as people.'] });
    expect(extended).toContain('Treat @handles as people.');
    // Caller rules are numbered after the defaults, never replacing them.
    expect(extended).toContain(`${DEFAULT_EXTRACTION_RULES.length + 1}. Treat @handles as people.`);
    expect(extended).toContain(DEFAULT_EXTRACTION_RULES[0]);
  });

  it.effect(
    'composes extractFactsStage as a pipeline stage without a store',
    Effect.fnUntraced(
      function* () {
        const collected: DocumentFacts[] = [];
        yield* Stream.fromIterable([
          { text: "I think I'm probably going to Paris next week", source: 'editor:input', author: 'Alice' },
        ]).pipe(extractFactsStage(), Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }));
        yield* Effect.sync(() => {
          if (collected.length !== 1) {
            throw new Error(`expected 1 stage output, got ${collected.length}`);
          }
          const [{ doc, facts }] = collected;
          if (doc.source !== 'editor:input') {
            throw new Error('document not passed through');
          }
          if (facts.length !== 1 || facts[0].assertion.predicate !== 'travelsTo') {
            throw new Error('facts not derived');
          }
        });
      },
      Effect.provide(queuedAiService([LLM_OUTPUT])),
    ),
  );

  it.effect(
    'indexFactsStage persists facts and drops cursor-unchanged documents from the stream',
    Effect.fnUntraced(function* () {
      const doc = { text: 'going to Paris', source: 'dxn:q:s1', author: 'Alice' };
      const runOnce = () =>
        Effect.gen(function* () {
          const collected: DocumentFacts[] = [];
          yield* Stream.fromIterable([doc]).pipe(
            indexFactsStage(),
            Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }),
          );
          return collected;
        });

      const first = yield* runOnce();
      const second = yield* runOnce(); // Unchanged source → skipped and dropped.
      const store = yield* SemanticStore;
      const persisted = yield* store.query({ predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (first.length !== 1 || first[0].facts.length !== 1) {
          throw new Error(`first run should index one document: ${JSON.stringify(first)}`);
        }
        if (second.length !== 0) {
          throw new Error(`unchanged re-ingest should emit nothing, got ${second.length}`);
        }
        if (persisted.length !== 1) {
          throw new Error(`expected 1 persisted fact, got ${persisted.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'normalizeFactsStage canonicalizes synonyms by relation key and passes others through',
    Effect.fnUntraced(function* () {
      // 'worked for' must match the table's 'works for' via relation-key normalization (inflection
      // and auxiliaries collapse); 'is-a' has no mapping and keeps its surface form.
      const input: DocumentFacts = {
        doc: { text: 'irrelevant', source: 'test:doc' },
        facts: [testFact('worked for'), testFact('Employed By'), testFact('is-a')],
      };
      const collected: DocumentFacts[] = [];
      yield* Stream.fromIterable([input]).pipe(
        normalizeFactsStage({ synonyms: { 'works for': 'works at', 'employed by': 'works at' } }),
        Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }),
      );
      yield* Effect.sync(() => {
        const predicates = collected[0].facts.map((fact) => fact.assertion.predicate);
        if (predicates.join('|') !== 'works at|works at|is-a') {
          throw new Error(`unexpected predicates: ${predicates.join('|')}`);
        }
      });
    }),
  );

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
        if (facts[0].factuality.value !== 'PR+') {
          throw new Error('factuality not extracted');
        }
        if (facts[0].attribution.source !== 'dxn:q:m1') {
          throw new Error('attribution source lost');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'accepts a model/provider override and still extracts (routing itself is proven by the gated pipeline-email test)',
    Effect.fnUntraced(
      function* () {
        const facts = yield* extractFacts(
          [
            {
              text: "I think I'm probably going to Paris next week",
              source: 'editor:input',
              author: 'Alice',
              date: '2026-06-06T00:00:00.000Z',
            },
          ],
          { model: 'com.openai.model.gpt-oss-20b.default', provider: 'dxn:org.dxos.provider.ollama' },
        );
        yield* Effect.sync(() => {
          if (facts.length !== 1) {
            throw new Error(`expected 1 fact, got ${facts.length}`);
          }
        });
      },
      Effect.provide(queuedAiService([LLM_OUTPUT])),
    ),
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
          // The original surface form is preserved as the display label (the entity id is the slug).
          if (!('entity' in fact.assertion.subject) || fact.assertion.subject.label !== 'Alice') {
            throw new Error(`subject label not preserved: ${JSON.stringify(fact.assertion.subject)}`);
          }
          if (fact.assertion.predicate !== 'travelsTo') {
            throw new Error('predicate not extracted');
          }
          if (fact.factuality.value !== 'PR+') {
            throw new Error('factuality not extracted');
          }
          if (fact.attribution.source !== 'editor:input') {
            throw new Error('attribution source lost');
          }
          // The author is normalized into the entity id space so consumers can join against it.
          if (fact.attribution.agent !== 'alice') {
            throw new Error(`attribution agent not normalized: ${fact.attribution.agent}`);
          }
        });
      },
      Effect.provide(queuedAiService([LLM_OUTPUT])),
    ),
  );

  it.effect(
    'drops ungrounded propositions whose subject or object is unknown',
    Effect.fnUntraced(
      function* () {
        const facts = yield* extractFacts([{ text: 'whatever', source: 'editor:input' }]);
        yield* Effect.sync(() => {
          if (facts.length !== 1) {
            throw new Error(`expected 1 grounded fact, got ${facts.length}`);
          }
          const [fact] = facts;
          if (!('entity' in fact.assertion.subject) || fact.assertion.subject.entity !== 'alice') {
            throw new Error('the grounded fact was dropped');
          }
        });
      },
      // One grounded fact plus two the model couldn't ground (unknown subject, empty object).
      Effect.provide(
        queuedAiService([
          {
            facts: [
              { subject: 'Alice', predicate: 'leads', object: 'DXOS', factuality: 'CT+', polarity: '+' },
              { subject: 'unknown', predicate: 'could get away', object: 'unknown', factuality: 'PS+', polarity: '+' },
              { subject: 'Bob', predicate: 'mentions', object: '', factuality: 'CT+', polarity: '+' },
            ],
          },
        ]),
      ),
    ),
  );

  it.effect(
    'normalizes a non-slug-safe author token so it joins against attribution.agent',
    Effect.fnUntraced(
      function* () {
        // A canonical agent token (e.g. `discord-user:<id>`) is normalized like any entity id; a
        // consumer filtering by the raw token must apply the same normalization to match.
        const author = 'discord-user:123456';
        const [fact] = yield* extractFacts([
          { text: "I think I'm probably going to Paris next week", source: 'discord:m1', author },
        ]);
        yield* Effect.sync(() => {
          if (fact.attribution.agent !== normalizeEntityId(author)) {
            throw new Error(`expected ${normalizeEntityId(author)}, got ${fact.attribution.agent}`);
          }
          if (fact.attribution.agent !== 'discord-user-123456') {
            throw new Error(`unexpected normalization: ${fact.attribution.agent}`);
          }
        });
      },
      Effect.provide(queuedAiService([LLM_OUTPUT])),
    ),
  );

  it.effect(
    'loads the discord fixture, runs it through the pipeline, and answers a query',
    Effect.fnUntraced(function* () {
      // One fact per extracted chunk so persisted-fact count equals the LLM call count.
      const ai = countingAiService({
        facts: [{ subject: 'Composer', predicate: 'discussedIn', object: 'Discord', factuality: 'CT+', polarity: '+' }],
      });
      // In-memory (browser/test) store layer — no SQLite.
      const layer = SemanticStore.layerMemory.pipe(Layer.provideMerge(ai.layer));
      yield* Effect.gen(function* () {
        const docs = loadDiscordDocs();
        yield* SemanticPipeline.run(docs);
        const store = yield* SemanticStore;

        // Structured query (builds + runs SPARQL) and the raw SELECT path used by the story's NL→SPARQL query.
        const byEntity = yield* store.query({ entity: 'composer' });
        const all = yield* store.select('SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }');
        // Fuzzy predicate: "discussed" is a substring of the stored "discussedIn".
        const byFuzzyPredicate = yield* store.query({ predicate: 'discussed' });

        yield* Effect.sync(() => {
          if (docs.length === 0) {
            throw new Error('no fixture documents loaded');
          }
          if (ai.calls() < docs.length) {
            throw new Error(`expected >= ${docs.length} extractions (one per message), got ${ai.calls()}`);
          }
          if (byEntity.length !== ai.calls()) {
            throw new Error(`query returned ${byEntity.length} facts but pipeline extracted ${ai.calls()}`);
          }
          if (all.length !== byEntity.length) {
            throw new Error(`raw select (${all.length}) and structured query (${byEntity.length}) disagree`);
          }
          if (byFuzzyPredicate.length !== byEntity.length) {
            throw new Error(`fuzzy predicate query returned ${byFuzzyPredicate.length}, expected ${byEntity.length}`);
          }
          const [fact] = byEntity;
          if (!('entity' in fact.assertion.subject) || fact.assertion.subject.entity !== 'composer') {
            throw new Error('subject entity not linked');
          }
          if (fact.assertion.predicate !== 'discussedIn') {
            throw new Error('predicate not extracted');
          }
          if (!fact.attribution.source.startsWith('discord:')) {
            throw new Error(`attribution source not from discord: ${fact.attribution.source}`);
          }
        });
      }).pipe(Effect.provide(layer));
    }),
  );
});

/** Minimal grounded fact for stage-level tests; only the predicate varies. */
const testFact = (predicate: string): Fact => ({
  id: `test:doc#hash#${predicate}`,
  assertion: {
    subject: { entity: 'alice', label: 'Alice' },
    predicate,
    object: { entity: 'acme', label: 'Acme' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'test:doc', generatedAtTime: '2026-01-01T00:00:00.000Z' },
  recordedAt: '2026-01-01T00:00:00.000Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'deadbeef',
});
