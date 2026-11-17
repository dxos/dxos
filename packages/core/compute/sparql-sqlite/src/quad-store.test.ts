//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Exchange from './exchange.ts';
import * as QuadStore from './quad-store.ts';
import { type Quad, XSD, iri, lit } from './terms.ts';

const EX = 'http://example.com/';
const quad = (s: string, o: string, g?: string): Quad => ({
  s: iri(`${EX}${s}`),
  p: iri(`${EX}name`),
  o: lit(o),
  g: g ? iri(`${EX}${g}`) : undefined,
});
const NAMES = 'SELECT ?n WHERE { GRAPH ?g { ?s <http://example.com/name> ?n } } ORDER BY ?n';
const names = (rows: readonly Record<string, { value: string } | undefined>[]) => rows.map((row) => row.n?.value);

/** A store over its own private database, so each replica starts empty. */
const openStore = (options: QuadStore.Options) =>
  Layer.build(SqliteClient.layer({ filename: ':memory:' })).pipe(
    Effect.flatMap((context) => QuadStore.make(options).pipe(Effect.provide(context))),
  );

describe('QuadStore', () => {
  it.effect('writes are queried back; updates must go through write', () =>
    Effect.gen(function* () {
      const store = yield* QuadStore.make();
      yield* store.write([{ _tag: 'insert', quads: [quad('a', 'Ann', 'g1'), quad('b', 'Bob', 'g2')] }]);
      expect(names(yield* store.query(NAMES))).toEqual(['Ann', 'Bob']);
      yield* store.write([{ _tag: 'delete', quads: [quad('a', 'Ann', 'g1')] }]);
      expect(names(yield* store.query(NAMES))).toEqual(['Bob']);
      const error = yield* Effect.flip(store.query('INSERT DATA { <a:s> <a:p> "x" }'));
      expect(error.message).toMatch(/write\(\)/);
    }).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );

  it.effect('the local part is separate, unlogged, and kept by a logged clear', () =>
    Effect.gen(function* () {
      const log = QuadStore.memoryLog();
      const store = yield* QuadStore.make({ log });
      yield* store.write([{ _tag: 'insert', quads: [quad('a', 'Ann', 'g1')] }]);
      yield* store.write([{ _tag: 'insert', quads: [quad('s', 'Sub', 'local')] }], { local: true });
      expect(names(yield* store.query(NAMES, { local: true }))).toEqual(['Sub']);
      expect(names(yield* store.query(NAMES))).toEqual(['Ann']);

      yield* store.write([{ _tag: 'clear' }]);
      expect(yield* store.query(NAMES)).toEqual([]);
      expect(names(yield* store.query(NAMES, { local: true }))).toEqual(['Sub']);
      expect((yield* log.read(undefined)).batches).toHaveLength(2);
    }).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );

  it.effect('an empty store rebuilds itself from the log, clears replayed in order', () =>
    Effect.gen(function* () {
      const log = QuadStore.memoryLog();
      const first = yield* openStore({ log });
      yield* first.write([{ _tag: 'insert', quads: [quad('a', 'Ann', 'g1')] }]);
      yield* first.write([{ _tag: 'clear' }]);
      yield* first.write([{ _tag: 'insert', quads: [quad('b', 'Bob', 'g2')] }]);

      const rebuilt = yield* openStore({ log });
      expect(names(yield* rebuilt.query(NAMES))).toEqual(['Bob']);
    }).pipe(Effect.scoped),
  );

  it.effect('a replica applies batches another writes, and tells its listeners', () =>
    Effect.gen(function* () {
      const log = QuadStore.memoryLog();
      const writer = yield* openStore({ log });
      const reader = yield* openStore({ log });
      const applied: string[] = [];
      yield* reader.listen((batch) => applied.push(batch.id));

      const id = yield* writer.write([{ _tag: 'insert', quads: [quad('a', 'Ann', 'g1')] }]);
      yield* Effect.yieldNow.pipe(Effect.repeat({ times: 20 }));
      expect(names(yield* reader.query(NAMES))).toEqual(['Ann']);
      expect(applied).toEqual([id]);
    }).pipe(Effect.scoped),
  );

  it.effect('stores under different prefixes share a database without sharing quads', () =>
    Effect.gen(function* () {
      const first = yield* QuadStore.make({ prefix: 's1_' });
      const second = yield* QuadStore.make({ prefix: 's2_' });
      yield* first.write([{ _tag: 'insert', quads: [quad('a', 'Ann', 'g1')] }]);
      expect(yield* second.query(NAMES)).toEqual([]);
      expect(yield* second.quads()).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );

  it.effect('export and import round-trip every quad in both formats', () =>
    Effect.gen(function* () {
      const source = yield* QuadStore.make({ prefix: 'src_' });
      const data: Quad[] = [
        quad('a', 'Ann', 'g1'),
        quad('b', 'Bob'),
        { s: iri(`${EX}a`), p: iri(`${EX}age`), o: lit('42', `${XSD}integer`), g: iri(`${EX}g1`) },
        { s: iri(`${EX}a`), p: iri(`${EX}label`), o: { termType: 'Literal', value: 'Anna', language: 'de' } },
        { s: { termType: 'BlankNode', value: 'b0' }, p: iri(`${EX}name`), o: lit('Blank'), g: iri(`${EX}g3`) },
      ];
      yield* source.write([{ _tag: 'insert', quads: data }]);
      const exported = yield* source.quads();

      for (const format of ['trig', 'binary'] as const) {
        const bytes = Exchange.encode(exported, format);
        const target = yield* QuadStore.make({ prefix: `dst_${format}_` });
        yield* target.write([{ _tag: 'insert', quads: Exchange.decode(bytes, format) }]);
        const key = (quads: readonly Quad[]) => quads.map((q) => JSON.stringify(q)).sort();
        expect(key(yield* target.quads())).toEqual(key(exported));
      }
      expect(Exchange.encode(exported, 'binary').length).toBeLessThan(Exchange.encode(exported, 'trig').length);
    }).pipe(Effect.scoped, Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );
});
