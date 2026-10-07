//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sanitize } from './sql-sanitizer.ts';

const tables = (sql: string) => {
  const result = sanitize(sql);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.analysis;
};

describe('sanitize', () => {
  test('collects tables from DML', ({ expect }) => {
    expect(tables('SELECT a.x, b.y FROM items AS a JOIN tags b ON a.id = b.item').tables).toEqual(['items', 'tags']);
    expect(tables('SELECT * FROM a, main.b c, "Quoted" WHERE x IN (SELECT y FROM d)').tables).toEqual([
      'a',
      'b',
      'quoted',
      'd',
    ]);
    expect(tables('INSERT OR REPLACE INTO items (id, name) VALUES (?, ?)').tables).toEqual(['items']);
    expect(tables('UPDATE OR IGNORE items SET name = :name WHERE id = $id').tables).toEqual(['items']);
    expect(tables('DELETE FROM items WHERE id = ?;').tables).toEqual(['items']);
    expect(
      tables('INSERT INTO items (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET name = excluded.name').tables,
    ).toEqual(['items']);
  });

  test('reads tables inside a parenthesized join', ({ expect }) => {
    expect(tables('SELECT * FROM (keyring)').tables).toEqual(['keyring']);
    expect(tables('SELECT * FROM ((owned, keyring))').tables).toEqual(['owned', 'keyring']);
    expect(tables('SELECT * FROM a JOIN (b JOIN c ON b.id = c.id) ON a.id = b.id').tables).toEqual(['a', 'b', 'c']);
    expect(tables('CREATE VIEW v AS SELECT * FROM (keyring)').tables).toEqual(['v', 'keyring']);
    expect(tables('SELECT * FROM (SELECT x FROM items) AS sub').tables).toEqual(['items']);
  });

  test('ignores names inside literals and comments', ({ expect }) => {
    expect(tables("SELECT 'FROM sqlite_master', X'00' FROM items -- FROM sqlite_master").tables).toEqual(['items']);
    expect(tables('SELECT /* FROM keyring */ 1').tables).toEqual([]);
  });

  test('reports DDL effects', ({ expect }) => {
    expect(
      tables('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, tag INTEGER REFERENCES tags(id))'),
    ).toEqual({ tables: ['items', 'tags'], created: 'items', dropped: undefined, renamed: undefined });
    expect(tables('CREATE UNIQUE INDEX idx ON items (name)')).toMatchObject({
      tables: ['idx', 'items'],
      created: 'idx',
    });
    expect(tables('DROP TABLE IF EXISTS items')).toMatchObject({ tables: ['items'], dropped: 'items' });
    expect(tables('ALTER TABLE items RENAME TO things')).toMatchObject({ renamed: { from: 'items', to: 'things' } });
    expect(tables('ALTER TABLE items RENAME COLUMN a TO b').renamed).toBeUndefined();
    expect(
      tables('CREATE TRIGGER trg AFTER UPDATE OF name ON items BEGIN INSERT INTO log VALUES (new.id); END'),
    ).toMatchObject({ tables: ['trg', 'items', 'log'], created: 'trg' });
  });

  test('rejects system tables and connection-level statements', ({ expect }) => {
    for (const sql of [
      'SELECT * FROM sqlite_master',
      'SELECT * FROM "SQLITE_SCHEMA"',
      'SELECT * FROM pragma_table_info(?)',
      'SELECT * FROM _cf_KV',
      'DELETE FROM dx_sql_service_objects',
      'PRAGMA writable_schema = ON',
      'ATTACH DATABASE ? AS other',
      'BEGIN',
      'COMMIT',
      'VACUUM INTO ?',
      'SELECT load_extension(?)',
      'CREATE TEMP TABLE scratch (id)',
      'SELECT * FROM temp.scratch',
      'SELECT 1; DROP TABLE items',
      "SELECT 'unterminated",
      '',
    ]) {
      expect(sanitize(sql).ok, sql).toBe(false);
    }
  });
});
