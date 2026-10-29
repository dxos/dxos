//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SqlSparqlEngine } from '@dxos/sparql-sqlite';
import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { type Fact, Ontology, Vocab } from '../types/index.ts';
import * as FactStoreLive from './fact-store-live.ts';
import { FactStore } from './fact-store.ts';

const mk = (over: Partial<Fact> & Pick<Fact, 'id'>): Fact => ({
  assertion: {
    subject: { kind: 'entity', entity: 'alice' },
    predicate: 'travelsTo',
    object: { kind: 'entity', entity: 'paris' },
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
  ...over,
});

const TestLayer = FactStoreLive.layerMemory;

/** Cloudflare Durable Object SQLite binds at most 100 parameters per statement; local SQLite allows far more. */
const DO_MAX_PARAMS = 100;

/** A store whose SQLite rejects statements binding more parameters than a Durable Object allows. */
const DurableObjectLimitLayer = Layer.effect(
  FactStore,
  Effect.acquireRelease(SqlStorage.makeMemory(), (database) => Effect.sync(() => database.close())).pipe(
    Effect.orDie,
    Effect.flatMap((database) =>
      FactStoreLive.make(
        {
          exec: (query, ...bindings) => {
            if (bindings.length > DO_MAX_PARAMS) {
              throw new Error(`too many SQL variables: ${bindings.length}`);
            }
            return database.exec(query, ...bindings);
          },
        },
        { transactionSync: (run) => database.transactionSync(run) },
      ),
    ),
  ),
);

describe('FactStore', () => {
  it.effect(
    'stores and queries the Alice fact by subject entity',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      const facts = yield* store.query({ subjectEntity: 'alice' });
      yield* Effect.sync(() => {
        if (facts.length !== 1 || facts[0].assertion.predicate !== 'travelsTo') {
          throw new Error('query failed');
        }
        if (facts[0].factuality.value !== 'PR+') {
          throw new Error('factuality lost');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'keeps conflicting facts about the same subject/predicate',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([
        mk({ id: 'f1' }),
        mk({
          id: 'f2',
          assertion: {
            subject: { kind: 'entity', entity: 'alice' },
            predicate: 'travelsTo',
            object: { kind: 'entity', entity: 'rome' },
          },
          attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
        }),
      ]);
      const facts = yield* store.query({ subjectEntity: 'alice', predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length !== 2) {
          throw new Error(`expected 2 conflicting facts, got ${facts.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'matches a predicate by its normalized relation key (case/inflection)',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([
        mk({
          id: 'f1',
          assertion: {
            subject: { kind: 'entity', entity: 'bob' },
            predicate: 'Works At',
            object: { kind: 'entity', entity: 'dxos' },
          },
        }),
      ]);
      // Different case + tense than stored, but the same relation key.
      const facts = yield* store.query({ predicate: 'is working at' });
      yield* Effect.sync(() => {
        if (facts.length !== 1) {
          throw new Error(`expected 1 fact via normalized predicate, got ${facts.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'preserves illocution through put -> query',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([
        mk({ id: 'f1', illocution: { force: 'directive', mood: 'interrogative', addressee: 'bob' } }),
        mk({ id: 'f2', illocution: { force: 'commissive' } }),
        mk({ id: 'f3' }),
      ]);
      const facts = yield* store.query({ subjectEntity: 'alice' });
      const byId = new Map(facts.map((fact) => [fact.id, fact]));
      expect(byId.get('f1')?.illocution).toEqual({ force: 'directive', mood: 'interrogative', addressee: 'bob' });
      expect(byId.get('f2')?.illocution).toEqual({ force: 'commissive' });
      expect(byId.get('f3')?.illocution).toBeUndefined();
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'preserves illocution through put -> query (in-memory store)',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([mk({ id: 'f1', illocution: { force: 'directive', mood: 'imperative' } })]);
      const [fact] = yield* store.query({});
      expect(fact.illocution).toEqual({ force: 'directive', mood: 'imperative' });
    }, Effect.provide(FactStoreLive.layerMemory)),
  );

  it.effect(
    'query with no filters returns all facts',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      const facts = yield* store.query({});
      yield* Effect.sync(() => {
        if (facts.length !== 1) {
          throw new Error(`expected 1 fact, got ${facts.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'cursor round-trips',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.setCursor('dxn:q:m1', 'hashA');
      const a = yield* store.cursor('dxn:q:m1');
      yield* store.setCursor('dxn:q:m1', 'hashB');
      const b = yield* store.cursor('dxn:q:m1');
      yield* Effect.sync(() => {
        if (a !== 'hashA' || b !== 'hashB') {
          throw new Error(`cursor wrong: ${a}/${b}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'clear removes all facts and cursors',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      yield* store.setCursor('dxn:q:m1', 'hashA');

      yield* store.clear();

      const facts = yield* store.query({});
      const cursor = yield* store.cursor('dxn:q:m1');
      yield* Effect.sync(() => {
        if (facts.length !== 0) {
          throw new Error(`expected 0 facts after clear, got ${facts.length}`);
        }
        if (cursor !== undefined) {
          throw new Error(`expected cleared cursor, got ${cursor}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'filters by entity (object position), source, and minConfidence',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([
        mk({ id: 'f1' }), // alice travelsTo paris, conf 0.6, source dxn:q:m1
        mk({
          id: 'f2',
          factuality: { value: 'PS+', polarity: '+', confidence: 0.3 },
          attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
        }),
      ]);

      const byObject = yield* store.query({ entity: 'paris' }); // both have object paris
      const bySource = yield* store.query({ source: 'dxn:q:m1' }); // only f1
      const confident = yield* store.query({ minConfidence: 0.5 }); // only f1 (0.6 >= 0.5)

      yield* Effect.sync(() => {
        if (byObject.length !== 2) {
          throw new Error(`entity(object) expected 2, got ${byObject.length}`);
        }
        if (bySource.length !== 1) {
          throw new Error(`source expected 1, got ${bySource.length}`);
        }
        if (confident.length !== 1 || confident[0].factuality.confidence !== 0.6) {
          throw new Error(`minConfidence expected 1 (0.6), got ${confident.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  describe.each([
    ['sqlite', TestLayer],
    ['memory', FactStoreLive.layerMemory],
  ] as const)('%s', (_, layer) => {
    it.effect(
      'keeps a minted predicate in the ontology graph, recording its first use once',
      Effect.fnUntraced(function* () {
        const store = yield* FactStore;
        const minted = (id: string, quote: string): Fact =>
          mk({
            id,
            assertion: {
              subject: { kind: 'entity', entity: 'alice' },
              predicate: 'travels to',
              predicateIri: `${Vocab.brainNamespace('agent-1')}travelTo`,
              predicateDescription: 'A place the subject is going to.',
              object: { kind: 'entity', entity: 'paris' },
              quote,
            },
          });
        yield* store.putFacts([minted('f1', 'Alice is off to Paris.')]);
        yield* store.putFacts([minted('f2', 'Alice flies to Paris on Monday.')]);
        const predicates = (yield* store.predicates()).filter(
          ({ definedBy }) => definedBy === Vocab.brainNamespace('agent-1'),
        );
        expect(predicates).toEqual([
          {
            iri: `${Vocab.brainNamespace('agent-1')}travelTo`,
            name: 'travel_to',
            label: 'travels to',
            description: 'A place the subject is going to.',
            definedBy: Vocab.brainNamespace('agent-1'),
            created: '2026-06-06T12:00:00.000Z',
            creator: 'default/m',
            example: 'Alice is off to Paris.',
          },
        ]);
        const [fact] = yield* store.query({ predicate: 'travels to' });
        expect(fact.assertion.predicateDescription).toBe('A place the subject is going to.');
      }, Effect.provide(layer)),
    );

    it.effect(
      'starts with the seed vocabulary, and restores it when cleared',
      Effect.fnUntraced(function* () {
        const store = yield* FactStore;
        const seeds = () =>
          store
            .predicates()
            .pipe(
              Effect.map((entries) =>
                entries.filter(({ iri }) => Ontology.DEFAULT.get(iri)?.iri === iri).map(({ iri }) => iri),
              ),
            );
        const expected = Ontology.DEFAULT.entries.map(({ iri }) => iri).sort();
        expect((yield* seeds()).sort()).toEqual(expected);
        expect((yield* store.predicates()).find(({ iri }) => iri === Vocab.RDF_TYPE)).toEqual(
          Ontology.DEFAULT.get(Vocab.RDF_TYPE),
        );
        yield* store.putFacts([mk({ id: 'f1' })]);
        yield* store.clear();
        expect(yield* store.query({})).toEqual([]);
        expect((yield* seeds()).sort()).toEqual(expected);
      }, Effect.provide(layer)),
    );

    it.effect(
      'finds a graph-local entity by its slug, and keeps an rdf:type statement',
      Effect.fnUntraced(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([
          mk({
            id: 'f1',
            graph: `${Vocab.GRAPH}one`,
            assertion: {
              subject: { kind: 'entity', entity: 'socrates', label: 'Socrates', type: 'person' },
              predicate: 'is a',
              predicateIri: Vocab.RDF_TYPE,
              object: { kind: 'entity', entity: 'man', label: 'man', type: 'concept' },
            },
          }),
        ]);
        const bySubject = yield* store.query({ subjectEntity: 'socrates' });
        const byObject = yield* store.query({ entity: 'man' });
        const byPredicate = yield* store.query({ predicate: 'is a' });
        for (const facts of [bySubject, byObject, byPredicate]) {
          expect(facts).toHaveLength(1);
          expect(facts[0].assertion.predicateIri).toBe(Vocab.RDF_TYPE);
          expect(facts[0].assertion.subject).toEqual({
            kind: 'entity',
            entity: 'socrates',
            label: 'Socrates',
            type: 'person',
          });
        }
      }, Effect.provide(layer)),
    );
  });

  it.effect(
    'rewrites the seed vocabulary of a store written by another seed',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (opened) =>
        Effect.sync(() => opened.close()),
      ).pipe(Effect.orDie);
      yield* FactStoreLive.make(database);
      // A store an older seed wrote: a stale synonym, and the marker of another version.
      const engine = new SqlSparqlEngine(database);
      engine.query(
        `INSERT DATA { GRAPH <${Vocab.ONTOLOGY_GRAPH}> { <${Vocab.RDF_TYPE}> <${Vocab.SKOS_ALT_LABEL}> "is kind of" } }`,
      );
      engine.query(`DELETE WHERE { <${Vocab.ONTOLOGY_GRAPH}> <${Vocab.SX_SEED}> ?version }`);
      engine.query(`INSERT DATA { <${Vocab.ONTOLOGY_GRAPH}> <${Vocab.SX_SEED}> "stale" }`);
      // A fresh open: the store is seeded when it is constructed.
      const entries = yield* (yield* FactStoreLive.make(database)).predicates();
      expect(entries.find(({ iri }) => iri === Vocab.RDF_TYPE)).toEqual(Ontology.DEFAULT.get(Vocab.RDF_TYPE));
    }, Effect.scoped),
  );

  it.effect(
    'reads back more facts than one statement may bind parameters for',
    Effect.fnUntraced(function* () {
      const store = yield* FactStore;
      const count = DO_MAX_PARAMS + 20;
      yield* store.putFacts(
        Array.from({ length: count }, (_, index) => mk({ id: `f${index}`, sourceHash: `h${index}` })),
      );
      const all = yield* store.query({});
      const bySubject = yield* store.query({ subjectEntity: 'alice' });
      expect(all).toHaveLength(count);
      expect(bySubject).toHaveLength(count);
    }, Effect.provide(DurableObjectLimitLayer)),
  );
});
