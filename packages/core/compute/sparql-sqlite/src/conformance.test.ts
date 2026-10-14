//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SqlSparqlEngine } from './engine.ts';
import { UnsupportedSparqlError } from './errors.ts';
import { type Quad, XSD, iri, lit } from './terms.ts';

// Regression tests for the bugs the W3C suite and the differential runs found (docs/CONFORMANCE.md).

const EX = 'http://example.com/';
const PREFIXES = `PREFIX ex: <${EX}> PREFIX xsd: <${XSD}> `;

const engineWith = (quads: Quad[]): SqlSparqlEngine => {
  const engine = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
  engine.init();
  engine.insert(quads);
  return engine;
};

const names = ['Eve', 'Alice', 'Fred', 'Bob'];
const people = (): Quad[] =>
  names.flatMap((name, index) => [
    { s: iri(`${EX}${name}`), p: iri(`${EX}name`), o: lit(name) },
    { s: iri(`${EX}${name}`), p: iri(`${EX}age`), o: lit(String(20 + index), `${XSD}integer`) },
  ]);

describe('conformance regressions', () => {
  test('ORDER BY survives the decode join', ({ expect }) => {
    const engine = engineWith(people());
    const rows = engine.query(`${PREFIXES}SELECT ?n WHERE { ?s ex:name ?n } ORDER BY ?n`);
    expect(rows.map((row) => row.n?.value)).toEqual(['Alice', 'Bob', 'Eve', 'Fred']);
    const desc = engine.query(`${PREFIXES}SELECT ?n WHERE { ?s ex:name ?n } ORDER BY DESC(?n)`);
    expect(desc.map((row) => row.n?.value)).toEqual(['Fred', 'Eve', 'Bob', 'Alice']);
  });

  test('CONSTRUCT and ASK honour VALUES, ORDER BY and LIMIT', ({ expect }) => {
    const engine = engineWith(people());
    const construct = engine.query(`${PREFIXES}CONSTRUCT { ?s ex:n ?n } WHERE { ?s ex:name ?n } ORDER BY ?n LIMIT 1`);
    expect(construct).toEqual([{ s: iri(`${EX}Alice`), p: iri(`${EX}n`), o: lit('Alice') }]);
    expect(engine.query(`${PREFIXES}ASK { ?s ex:name ?n } VALUES ?n { "Nobody" }`)).toEqual([]);
  });

  test('CONSTRUCT template blank nodes are fresh per solution', ({ expect }) => {
    const engine = engineWith(people());
    const triples = engine.query(`${PREFIXES}CONSTRUCT { _:b ex:of ?s } WHERE { ?s ex:name ?n }`);
    expect(new Set(triples.map((triple) => triple.s?.value)).size).toBe(4);
  });

  test('GRAPH ?g ranges over named graphs when the body binds none', ({ expect }) => {
    const engine = engineWith([
      { s: iri(`${EX}a`), p: iri(`${EX}p`), o: lit('1'), g: iri(`${EX}g1`) },
      { s: iri(`${EX}b`), p: iri(`${EX}p`), o: lit('2'), g: iri(`${EX}g2`) },
    ]);
    expect(engine.query(`SELECT ?g WHERE { GRAPH ?g {} }`)).toHaveLength(2);
    expect(engine.query(`${PREFIXES}SELECT * WHERE { GRAPH ex:missing {} }`)).toEqual([]);
    // Sub-selects and EXISTS inside GRAPH are evaluated in that graph, not the default graph.
    expect(engine.query(`${PREFIXES}SELECT ?g ?s WHERE { GRAPH ?g { SELECT ?s { ?s ex:p ?o } } }`)).toHaveLength(2);
    expect(
      engine.query(`${PREFIXES}SELECT ?s WHERE { GRAPH ex:g1 { ?s ex:p ?o FILTER EXISTS { ?s ex:p "1" } } }`),
    ).toEqual([{ s: iri(`${EX}a`) }]);
    // ?g is in neither side's domain, so MINUS with no shared variable removes nothing.
    expect(engine.query(`${PREFIXES}SELECT ?s WHERE { GRAPH ?g { ?s ex:p ?o MINUS { ?x ex:p ?y } } }`)).toHaveLength(2);
  });

  test('aggregate results feed expressions; errors make SUM/AVG unbound', ({ expect }) => {
    const engine = engineWith([
      ...['1', '4'].map((value) => ({ s: iri(`${EX}x`), p: iri(`${EX}v`), o: lit(value, `${XSD}integer`) })),
      { s: iri(`${EX}y`), p: iri(`${EX}v`), o: lit('2', `${XSD}integer`) },
      { s: iri(`${EX}y`), p: iri(`${EX}v`), o: lit('oops') },
    ]);
    const rows = engine.query(
      `${PREFIXES}SELECT ?s (AVG(?v) AS ?avg) ((MIN(?v) + MAX(?v)) / 2 AS ?mid) WHERE { ?s ex:v ?v } GROUP BY ?s ORDER BY ?s`,
    );
    expect(rows[0].avg?.value).toBe('2.5');
    expect(rows[0].mid?.value).toBe('2.5');
    expect(rows[1].avg).toBeUndefined();
  });

  test('MIN and MAX order negative numbers by value', ({ expect }) => {
    const engine = engineWith(
      ['-5', '-1.5', '-1', '3'].map((value) => ({
        s: iri(`${EX}x`),
        p: iri(`${EX}v`),
        o: lit(value, `${XSD}decimal`),
      })),
    );
    const [row] = engine.query(
      `${PREFIXES}SELECT (MIN(?v) AS ?min) (MAX(?v) AS ?max) WHERE { ?s ex:v ?v FILTER(?v < 0) }`,
    );
    expect([row.min?.value, row.max?.value]).toEqual(['-5', '-1']);
  });

  test('trailing VALUES joins the grouped solutions', ({ expect }) => {
    const engine = engineWith(people());
    const rows = engine.query(`${PREFIXES}SELECT ?s ?k WHERE { ?s ex:name ?n } GROUP BY ?s VALUES ?k { 1 }`);
    expect(rows.every((row) => row.k?.value === '1')).toBe(true);
  });

  test('empty VALUES rows, CONCAT() and COALESCE() compile', ({ expect }) => {
    const engine = engineWith(people());
    expect(engine.query(`${PREFIXES}SELECT ?s WHERE { ?s ex:name ?n } VALUES () { () () }`)).toHaveLength(8);
    expect(engine.query(`SELECT (CONCAT() AS ?c) (COALESCE() AS ?e) WHERE {}`)).toEqual([{ c: lit('') }]);
  });

  test('boolean equality is by value; casts reject foreign lexical forms', ({ expect }) => {
    const engine = engineWith([
      { s: iri(`${EX}a`), p: iri(`${EX}l`), o: lit('true', `${XSD}boolean`) },
      { s: iri(`${EX}a`), p: iri(`${EX}r`), o: lit('1', `${XSD}boolean`) },
      { s: iri(`${EX}b`), p: iri(`${EX}l`), o: lit('1.5') },
    ]);
    expect(engine.query(`${PREFIXES}SELECT ?s WHERE { ?s ex:l ?l ; ex:r ?r FILTER(?l = ?r) }`)).toHaveLength(1);
    expect(engine.query(`${PREFIXES}SELECT (xsd:integer(?l) AS ?i) WHERE { ex:b ex:l ?l }`)).toEqual([{}]);
    expect(engine.query(`${PREFIXES}SELECT (xsd:boolean(?l) AS ?i) WHERE { ex:b ex:l ?l }`)).toEqual([{}]);
    expect(engine.query(`${PREFIXES}SELECT (xsd:double(?l) AS ?i) WHERE { ex:b ex:l ?l }`)[0].i?.value).toBe('1.5');
  });

  test('constants absent from the store work inside expressions without shadowing terms elsewhere', ({ expect }) => {
    const engine = engineWith(people());
    expect(engine.query(`SELECT ?x WHERE { VALUES ?x { "brand new" } FILTER(STRLEN(?x) = 9) }`)).toEqual([
      { x: lit('brand new') },
    ]);
    // A plain pattern or filter constant needs no temp terms: the CTE would make SQLite scan all terms.
    expect(engine.explain(`${PREFIXES}SELECT ?s WHERE { ?s ex:name "Nobody" }`).sql).not.toContain('NOT MATERIALIZED');
    expect(engine.explain(`${PREFIXES}SELECT ?s WHERE { ?s ex:name ?n FILTER(?n = "Nobody") }`).sql).not.toContain(
      'NOT MATERIALIZED',
    );
  });

  test('zero-length paths from a bound variable only reach graph nodes', ({ expect }) => {
    const engine = engineWith(people());
    expect(engine.query(`${PREFIXES}SELECT * WHERE { VALUES ?v { 1 } ?v ex:p? ?v }`)).toEqual([]);
  });

  test('FROM is rejected rather than ignored', ({ expect }) => {
    const engine = engineWith(people());
    expect(() => engine.query(`${PREFIXES}SELECT * FROM ex:g WHERE { ?s ?p ?o }`)).toThrow(UnsupportedSparqlError);
  });
});
