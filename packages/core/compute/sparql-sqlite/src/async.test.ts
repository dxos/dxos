//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SqlSparqlEngineAsync } from './async.ts';
import { SqlSparqlEngine } from './engine.ts';
import { UnsupportedSparqlError } from './errors.ts';
import { iri, lit } from './terms.ts';
import { QUERIES, checksumRows, generateFacts } from './testing/index.ts';

const FACTS = 2_000;
const BATCH = 500;

const loadSync = (): SqlSparqlEngine => {
  const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
  engine.init();
  for (let start = 0; start < FACTS; start += BATCH) {
    engine.insert(generateFacts(start, BATCH));
  }
  return engine;
};

const loadAsync = Effect.gen(function* () {
  const engine = new SqlSparqlEngineAsync();
  yield* engine.init();
  for (let start = 0; start < FACTS; start += BATCH) {
    yield* engine.insert(generateFacts(start, BATCH));
  }
  return engine;
});

const Sqlite = SqliteClient.layer({ filename: ':memory:' });

describe('SqlSparqlEngineAsync', () => {
  it.effect('answers every benchmark query as the sync engine does', () =>
    Effect.gen(function* () {
      const sync = loadSync();
      const engine = yield* loadAsync;
      expect(yield* engine.count()).toBe(sync.count());
      for (const { id, sparql } of QUERIES) {
        const expected = checksumRows(sync.query(sparql));
        expect({ id, rows: checksumRows(yield* engine.query(sparql)) }).toEqual({ id, rows: expected });
      }
    }).pipe(Effect.provide(Sqlite)),
  );

  it.effect('applies updates and compiles plans against the new terms', () =>
    Effect.gen(function* () {
      const engine = new SqlSparqlEngineAsync();
      yield* engine.init();
      yield* engine.insert([{ s: iri('http://ex/a'), p: iri('http://ex/name'), o: lit('Ann') }]);
      const query = 'SELECT ?s WHERE { ?s <http://ex/name> "Bob" }';
      expect(yield* engine.query(query)).toEqual([]);

      yield* engine.query('INSERT DATA { <http://ex/b> <http://ex/name> "Bob" }');
      expect(yield* engine.query(query)).toEqual([{ s: { termType: 'NamedNode', value: 'http://ex/b' } }]);

      yield* engine.query('DELETE WHERE { ?s <http://ex/name> "Bob" }');
      expect(yield* engine.query(query)).toEqual([]);
      expect(yield* engine.count()).toBe(1);
    }).pipe(Effect.provide(Sqlite)),
  );

  it.effect('fails with a SPARQL error rather than dying', () =>
    Effect.gen(function* () {
      const engine = new SqlSparqlEngineAsync();
      yield* engine.init();
      const error = yield* Effect.flip(engine.query('SELECT ?s FROM <http://ex/g> WHERE { ?s ?p ?o }'));
      expect(error).toBeInstanceOf(UnsupportedSparqlError);
    }).pipe(Effect.provide(Sqlite)),
  );

  it.effect('runs its writes in the caller transaction', () =>
    Effect.gen(function* () {
      const engine = new SqlSparqlEngineAsync();
      yield* engine.init();
      const sql = yield* SqliteClient.SqliteClient;
      yield* sql
        .withTransaction(
          Effect.andThen(
            engine.insert([{ s: iri('http://ex/a'), p: iri('http://ex/p'), o: lit('x') }]),
            Effect.fail('rolled back' as const),
          ),
        )
        .pipe(Effect.flip);
      expect(yield* engine.count()).toBe(0);
    }).pipe(Effect.provide(Sqlite)),
  );
});
