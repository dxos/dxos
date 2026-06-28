//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { DataFactory, type Quad } from 'n3';

import { migrate } from '../sqlite/schema';
import { insertQuads, makeSqliteSource } from './sqlite-source';

const { namedNode, literal } = DataFactory;
const TestLayer = SqliteClient.layer({ filename: ':memory:' });

const collect = (stream: import('asynciterator').AsyncIterator<Quad>): Promise<Quad[]> =>
  new Promise((resolve, reject) => {
    const out: Quad[] = [];
    stream.on('data', (q) => out.push(q));
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
  });

describe('sqlite source', () => {
  it.effect(
    'match returns quads by subject pattern',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* insertQuads(sql, [
        DataFactory.quad(namedNode('s:a'), namedNode('p:1'), namedNode('o:x')),
        DataFactory.quad(namedNode('s:b'), namedNode('p:1'), namedNode('o:y')),
      ]);
      const source = makeSqliteSource(sql);
      const results = yield* Effect.promise(() => collect(source.match(namedNode('s:a'), null, null, null)));
      yield* Effect.sync(() => {
        if (results.length !== 1) {
          throw new Error(`expected 1 quad, got ${results.length}`);
        }
        if (results[0].object.value !== 'o:x') {
          throw new Error('wrong object');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'match returns all quads when fully unbound',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* insertQuads(sql, [
        DataFactory.quad(namedNode('s:a'), namedNode('p:1'), namedNode('o:x')),
        DataFactory.quad(namedNode('s:b'), namedNode('p:2'), DataFactory.literal('hello')),
      ]);
      const source = makeSqliteSource(sql);
      const results = yield* Effect.promise(() => collect(source.match(null, null, null, null)));
      yield* Effect.sync(() => {
        if (results.length !== 2) {
          throw new Error(`expected 2 quads, got ${results.length}`);
        }
        const lit = results.find((q) => q.object.termType === 'Literal');
        if (!lit || lit.object.value !== 'hello') {
          throw new Error('literal object not reconstructed');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'bound IRI object does not match a literal of the same lexical value',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* insertQuads(sql, [
        DataFactory.quad(namedNode('s:a'), namedNode('p:1'), namedNode('o:x')),
        DataFactory.quad(namedNode('s:b'), namedNode('p:1'), literal('o:x')),
      ]);
      const source = makeSqliteSource(sql);
      const results = yield* Effect.promise(() => collect(source.match(null, null, namedNode('o:x'), null)));
      yield* Effect.sync(() => {
        if (results.length !== 1) {
          throw new Error(`expected 1 quad, got ${results.length}`);
        }
        if (results[0].object.termType !== 'NamedNode') {
          throw new Error('expected IRI object');
        }
        if (results[0].subject.value !== 's:a') {
          throw new Error('wrong subject');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'named-graph quad round-trips with its graph preserved',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* insertQuads(sql, [
        DataFactory.quad(namedNode('s:a'), namedNode('p:1'), namedNode('o:x'), namedNode('g:1')),
      ]);
      const source = makeSqliteSource(sql);
      const results = yield* Effect.promise(() => collect(source.match(null, null, null, null)));
      yield* Effect.sync(() => {
        if (results.length !== 1) {
          throw new Error(`expected 1 quad, got ${results.length}`);
        }
        if (results[0].graph.value !== 'g:1') {
          throw new Error(`graph not preserved: ${results[0].graph.value}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );
});
