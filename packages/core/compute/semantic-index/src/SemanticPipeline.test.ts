//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readFileSync } from 'node:fs';

import { SemanticIndexError } from './errors';
import { type ExtractDocument, SemanticPipeline, extractFacts, normalizeEntityId } from './SemanticPipeline';
import { SemanticStore } from './SemanticStore';
import { countingAiService, failingAiService, mockAiService, queuedAiService } from './testing';

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
