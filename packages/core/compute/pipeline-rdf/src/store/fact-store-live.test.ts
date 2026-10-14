//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SqlSparqlEngine } from '@dxos/sparql-sqlite';
import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SemanticIndexError } from '../errors.ts';
import { buildSparql } from '../internal/sparql/query-builder.ts';
import { type Fact } from '../types/index.ts';
import * as Mapping from '../types/Mapping.ts';
import * as FactStoreLive from './fact-store-live.ts';

const fact = (id: string, over: Partial<Fact> = {}): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'alice', label: 'Alice' },
    predicate: 'travelsTo',
    object: { kind: 'entity', entity: 'paris' },
    validFrom: '2026-06-01T00:00:00.000Z',
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: {
    agent: 'alice',
    source: 'dxn:q:m1',
    generatedAtTime: '2026-06-06T00:00:00.000Z',
    span: { start: 3, end: 10 },
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
  ...over,
});

/** A fact as stored: named graphs key statements by predicate IRI, which reads back on the fact. */
const stored = (written: Fact): Fact => ({
  ...written,
  assertion: { ...written.assertion, predicateIri: Mapping.predicateOf(written) },
});

const termOf = (found: Fact) =>
  found.assertion.subject.kind === 'entity' ? found.assertion.subject.entity : found.assertion.subject.literal;

const withFile = <A, E>(run: (path: string) => Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.acquireUseRelease(
    Effect.sync(() => mkdtempSync(join(tmpdir(), 'fact-store-'))),
    (dir) => run(join(dir, 'facts.db')),
    (dir) => Effect.sync(() => rmSync(dir, { recursive: true, force: true })),
  );

const openFile = (path: string) =>
  Effect.acquireRelease(SqlStorage.makeFile(path), (database) => Effect.sync(() => database.close())).pipe(
    Effect.orDie,
  );

describe('FactStoreLive', () => {
  it.effect(
    'facts and cursors survive reopening a file-backed database',
    Effect.fnUntraced(function* () {
      yield* withFile((path) =>
        Effect.gen(function* () {
          yield* Effect.scoped(
            Effect.gen(function* () {
              const store = yield* FactStoreLive.make(yield* openFile(path));
              yield* store.putFacts([fact('f1'), fact('f2', { sourceHash: 'h2' })]);
              yield* store.setCursor('dxn:q:m1', 'hashA');
            }),
          );
          const [facts, cursor] = yield* Effect.scoped(
            Effect.gen(function* () {
              const store = yield* FactStoreLive.make(yield* openFile(path));
              return [yield* store.query({}), yield* store.cursor('dxn:q:m1')] as const;
            }),
          );
          expect(facts.map((found) => found.id).sort()).toEqual(['f1', 'f2']);
          expect(facts.find((found) => found.id === 'f1')).toEqual(stored(fact('f1')));
          expect(cursor).toBe('hashA');
        }),
      );
    }),
  );

  it.effect(
    'round-trips typed literals with their datatypes',
    Effect.fnUntraced(function* () {
      const database = yield* openFile(':memory:');
      const store = yield* FactStoreLive.make(database);
      yield* store.putFacts([fact('f1')]);
      // The store and a raw engine share the database, so typed literals inserted beside the facts are visible.
      const engine = new SqlSparqlEngine(database);
      engine.init();
      const xsd = 'http://www.w3.org/2001/XMLSchema#';
      engine.query(
        `INSERT DATA { <urn:x> <urn:at> "2026-06-06T00:00:00.5Z"^^<${xsd}dateTime> ; <urn:conf> "0.75"^^<${xsd}decimal> ; <urn:label> "hi"@en }`,
      );
      const rows = engine.query('SELECT ?p ?o WHERE { <urn:x> ?p ?o } ORDER BY ?p');
      expect(rows.map((row) => row.o)).toEqual([
        { termType: 'Literal', value: '2026-06-06T00:00:00.5Z', datatype: `${xsd}dateTime` },
        { termType: 'Literal', value: '0.75', datatype: `${xsd}decimal` },
        { termType: 'Literal', value: 'hi', language: 'en' },
      ]);
      // Facts reassemble unchanged, numbers included.
      expect(yield* store.query({ minConfidence: 0.5 })).toEqual([stored(fact('f1'))]);
    }, Effect.scoped),
  );

  it.effect(
    'select runs SPARQL through the compiler and reports unsupported constructs as SemanticIndexError',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      yield* store.putFacts([
        fact('f1'),
        fact('f2', {
          assertion: {
            subject: { kind: 'entity', entity: 'bob' },
            predicate: 'worksAt',
            object: { kind: 'entity', entity: 'dxos' },
          },
          factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
        }),
      ]);
      const all = yield* store.select('SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }');
      expect(all.map((found) => found.id).sort()).toEqual(['f1', 'f2']);
      const confident = yield* store.select(`
        PREFIX sx: <https://dxos.org/semantic#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        SELECT ?fact ?p ?o WHERE {
          { SELECT DISTINCT ?fact WHERE { ?fact sx:confidence ?conf FILTER(xsd:decimal(?conf) >= 0.8) } }
          ?fact ?p ?o .
        }`);
      expect(confident.map((found) => found.id)).toEqual(['f2']);

      const error = yield* store.select('DESCRIBE <urn:x>').pipe(Effect.flip);
      expect(error).toBeInstanceOf(SemanticIndexError);
    }),
  );

  it.effect(
    'matches statements, not whole graphs, and loads the graphs a raw SELECT binds to ?g',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      const graph = 'https://dxos.org/semantic/graph/team';
      yield* store.putFacts([
        fact('f1', { graph }),
        fact('f2', {
          graph,
          assertion: {
            subject: { kind: 'entity', entity: 'bob' },
            predicate: 'works at',
            object: { kind: 'entity', entity: 'dxos' },
          },
        }),
      ]);
      const bob = yield* store.query({ entity: 'bob' });
      expect(bob.map((found) => found.assertion.predicate)).toEqual(['works at']);
      const working = yield* store.query({ predicate: 'is working at' });
      expect(working.map((found) => termOf(found))).toEqual(['bob']);
      const selected = yield* store.select(buildSparql({ subjectEntity: 'bob' }));
      expect(selected.map((found) => termOf(found)).sort()).toEqual(['alice', 'bob']);
      expect(yield* store.select(buildSparql({ source: 'dxn:q:none' }))).toEqual([]);
    }),
  );

  it.effect(
    'drops the earlier text-triples tables on open',
    Effect.fnUntraced(function* () {
      const database = yield* openFile(':memory:');
      database.exec(
        `CREATE TABLE triples (s TEXT NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL, oType TEXT NOT NULL, g TEXT NOT NULL DEFAULT '')`,
      );
      database.exec('CREATE TABLE entities (id TEXT PRIMARY KEY)');
      database.exec('CREATE TABLE cursors (source TEXT PRIMARY KEY, hash TEXT NOT NULL)');
      database.exec('CREATE TABLE rdf_migrations (migration_id INTEGER PRIMARY KEY)');
      database.exec('CREATE TABLE unrelated (id INTEGER)');

      const store = yield* FactStoreLive.make(database);
      const tables = database
        .exec(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
        .toArray()
        .map((row) => row.name);
      expect(tables).not.toContain('triples');
      expect(tables).not.toContain('entities');
      expect(tables).not.toContain('cursors');
      expect(tables).not.toContain('rdf_migrations');
      expect(tables).toContain('unrelated');
      expect(tables).toContain('fact_cursors');

      yield* store.setCursor('dxn:q:m1', 'hashA');
      // Reopening keeps the store's own tables.
      const reopened = yield* FactStoreLive.make(database);
      expect(yield* reopened.cursor('dxn:q:m1')).toBe('hashA');
    }, Effect.scoped),
  );
});
