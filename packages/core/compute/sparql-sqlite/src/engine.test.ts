//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { beforeAll, describe, test } from 'vitest';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SqlSparqlEngine } from './engine.ts';
import { UnsupportedSparqlError } from './errors.ts';
import { XSD, iri, lit } from './terms.ts';
import { ORACLE, PROBES, QUERIES, checksumRows, generateCode, generateFacts, queryById } from './testing/index.ts';

const EX = 'http://example.com/';
const PREFIXES = `PREFIX ex: <${EX}> PREFIX sx: <https://dxos.org/sx#> `;

describe('SqlSparqlEngine', () => {
  describe('facts:1000', () => {
    let engine: SqlSparqlEngine;
    beforeAll(() => {
      engine = loadEngine(1000, generateFacts, 1000);
    });

    for (const query of QUERIES.filter((query) => query.id !== 'Q7_path')) {
      test(query.id, ({ expect }) => {
        const rows = engine.query(query.sparql);
        expect({ rows: rows.length, checksum: checksumRows(rows) }).toEqual(ORACLE['facts:1000'][query.id]);
      });
    }

    for (const probe of PROBES) {
      test(`probe ${probe.id}`, ({ expect }) => {
        const rows = engine.query(probe.sparql);
        expect({ rows: rows.length, checksum: checksumRows(rows) }).toEqual(ORACLE.probes[probe.id]);
      });
    }
  });

  describe('facts:10000', () => {
    let engine: SqlSparqlEngine;
    beforeAll(() => {
      engine = loadEngine(10_000, generateFacts, 1000);
    });

    for (const query of QUERIES.filter((query) => query.id !== 'Q7_path')) {
      test(query.id, ({ expect }) => {
        const rows = engine.query(query.sparql);
        expect({ rows: rows.length, checksum: checksumRows(rows) }).toEqual(ORACLE['facts:10000'][query.id]);
      });
    }
  });

  test('selectivity hints change plans only and are refreshed on writes', ({ expect }) => {
    const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    engine.init();
    const typed = (from: number, count: number, type: string) =>
      Array.from({ length: count }, (_, index) => ({
        s: iri(`${EX}s${from + index}`),
        p: iri(`${EX}type`),
        o: iri(`${EX}${type}`),
      }));
    // Enough quads that the store has run ANALYZE, which the hints need as their baseline.
    engine.insert([...typed(0, 100, 'A'), ...typed(100, 4900, 'B')]);
    const query = `${PREFIXES} SELECT ?s WHERE { ?s ex:type ex:A }`;
    const hinted = engine.explain(query).sql;
    expect(hinted).toContain('likelihood(');
    const rows = checksumRows(engine.query(query));
    engine.selectivityHints = false;
    engine.clearPlans();
    expect(engine.explain(query).sql).not.toContain('likelihood(');
    expect(checksumRows(engine.query(query))).toEqual(rows);
    engine.selectivityHints = true;
    engine.insert(typed(5000, 2000, 'A'));
    expect(engine.explain(query).sql).not.toEqual(hinted);
    expect(engine.query(query)).toHaveLength(2100);
  });

  test('code:10000 transitive path', ({ expect }) => {
    const engine = loadEngine(10_000, generateCode, 2000);
    const rows = engine.query(queryById('Q7_path').sparql);
    expect({ rows: rows.length, checksum: checksumRows(rows) }).toEqual(ORACLE['code:10000'].Q7_path);
  });

  test('update round trip', ({ expect }) => {
    const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    engine.init();
    engine.insert(generateFacts(0, 100));
    const before = engine.count();

    engine.query(`${PREFIXES}INSERT DATA { ex:a ex:p "x" . ex:a ex:p 5 . GRAPH ex:g { ex:a ex:q ex:b } }`);
    expect(engine.count()).toBe(before + 3);
    expect(engine.query(`${PREFIXES}SELECT ?g ?s WHERE { GRAPH ?g { ?s ?p ?o } }`)).toEqual([
      { g: iri(`${EX}g`), s: iri(`${EX}a`) },
    ]);

    engine.query(`${PREFIXES}DELETE DATA { ex:a ex:p "x" }`);
    expect(engine.query(`${PREFIXES}SELECT ?o WHERE { ex:a ex:p ?o }`)).toEqual([{ o: lit('5', `${XSD}integer`) }]);

    const forced = engine.query(`${PREFIXES}SELECT (COUNT(*) AS ?n) WHERE { ?f sx:force ?x }`)[0].n?.value;
    engine.query(`${PREFIXES}DELETE { ?f sx:force ?x } INSERT { ?f ex:wasForced true } WHERE { ?f sx:force ?x }`);
    expect(engine.query(`${PREFIXES}SELECT (COUNT(*) AS ?n) WHERE { ?f ex:wasForced true }`)[0].n?.value).toBe(forced);
    expect(engine.query(`${PREFIXES}ASK { ?f sx:force ?x }`)).toEqual([]);

    engine.query(`${PREFIXES}DELETE WHERE { ?f ex:wasForced ?v }`);
    expect(engine.query(`${PREFIXES}SELECT (COUNT(*) AS ?n) WHERE { ?f ex:wasForced ?v }`)[0].n?.value).toBe('0');
    expect(engine.count()).toBe(before + 2 - Number(forced));
  });

  test('ASK and CONSTRUCT', ({ expect }) => {
    const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    engine.init();
    engine.insert([
      { s: iri(`${EX}a`), p: iri(`${EX}p`), o: lit('x') },
      { s: iri(`${EX}a`), p: iri(`${EX}p`), o: lit('5', `${XSD}integer`) },
    ]);
    expect(engine.query(`${PREFIXES}ASK { ex:a ex:p 5 }`)).toEqual([{}]);
    expect(engine.query(`${PREFIXES}ASK { ex:a ex:p 6 }`)).toEqual([]);
    const triples = engine.query(`${PREFIXES}CONSTRUCT { ?s ex:copy ?o } WHERE { ?s ex:p ?o }`);
    expect(triples).toHaveLength(2);
    expect(triples).toContainEqual({ s: iri(`${EX}a`), p: iri(`${EX}copy`), o: lit('x') });
  });

  test('unsupported constructs throw typed errors', ({ expect }) => {
    const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    engine.init();
    expect(() => engine.query(`SELECT ?s WHERE { ?s ?p ?o FILTER(REGEX(?o, "a+")) }`)).toThrow(UnsupportedSparqlError);
    expect(() => engine.query(`SELECT ?s WHERE { SERVICE <${EX}s> { ?s ?p ?o } }`)).toThrow(UnsupportedSparqlError);
    expect(() => engine.query(`SELECT ?d WHERE { ?s ?p ?o BIND(DATATYPE(?o) AS ?d) }`)).toThrow(UnsupportedSparqlError);
  });
});

/** Fresh in-memory engine loaded in `batch`-sized inserts, as a DO would ingest. */
const loadEngine = (count: number, generate: typeof generateFacts, batch: number): SqlSparqlEngine => {
  const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
  engine.init();
  for (let start = 0; start < count; start += batch) {
    engine.insert(generate(start, Math.min(batch, count - start)));
  }
  return engine;
};
