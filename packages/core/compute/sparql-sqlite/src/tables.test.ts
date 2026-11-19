//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { SqlSparqlEngine } from './engine.ts';
import { tables } from './tables.ts';
import { QUERIES, checksumRows, generateFacts } from './testing/index.ts';

describe('table prefix', () => {
  test('stores under different prefixes share a database without sharing rows', ({ expect }) => {
    const database = Effect.runSync(SqlStorage.makeMemory());
    const first = new SqlSparqlEngine(database, { prefix: 'm1_' });
    const second = new SqlSparqlEngine(database, { prefix: 'm2_' });
    first.init();
    second.init();
    first.insert(generateFacts(0, 200));
    expect(first.count()).toBeGreaterThan(0);
    expect(second.count()).toBe(0);
    const names = database
      .exec(`SELECT name FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name`)
      .toArray()
      .map(({ name }) => String(name))
      .filter((name) => !name.startsWith('sqlite_'));
    expect(names.every((name) => name.startsWith('m1_') || name.startsWith('m2_'))).toBe(true);
  });

  test('a prefixed store answers every benchmark query as an unprefixed one', ({ expect }) => {
    const plain = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()));
    const prefixed = new SqlSparqlEngine(Effect.runSync(SqlStorage.makeMemory()), { prefix: 'mem_' });
    for (const engine of [plain, prefixed]) {
      engine.init();
      engine.insert(generateFacts(0, 1_000));
    }
    for (const { id, sparql } of QUERIES) {
      expect({ id, rows: checksumRows(prefixed.query(sparql)) }).toEqual({
        id,
        rows: checksumRows(plain.query(sparql)),
      });
    }
  });

  test('a prefix is limited to identifier characters', ({ expect }) => {
    expect(() => tables('x; DROP TABLE quads')).toThrow(TypeError);
  });
});
