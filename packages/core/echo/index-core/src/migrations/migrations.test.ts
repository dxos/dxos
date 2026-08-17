//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { readdirSync } from 'node:fs';
import { test } from 'vitest';

import { SqlMigrations, SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS as ENTITY_META, MIGRATIONS_TABLE as ENTITY_META_TABLE } from './entity-meta';
import entityMetaInit from './entity-meta/0001_init.sql?raw';
import { MIGRATIONS as FTS } from './fts';
import ftsInit from './fts/0001_init.sql?raw';
import { MIGRATIONS as REVERSE_REF } from './reverse-ref';
import reverseRefInit from './reverse-ref/0001_init.sql?raw';
import { MIGRATIONS as TRACKER } from './tracker';
import trackerInit from './tracker/0001_init.sql?raw';

const TestLayer = SqlTransaction.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

const STORES = [
  { name: 'entity-meta', init: entityMetaInit, manifest: ENTITY_META },
  { name: 'fts', init: ftsInit, manifest: FTS },
  { name: 'reverse-ref', init: reverseRefInit, manifest: REVERSE_REF },
  { name: 'tracker', init: trackerInit, manifest: TRACKER },
];

const migrateEntityMeta = Migrator.make({})({
  loader: Migrator.fromRecord(ENTITY_META),
  table: ENTITY_META_TABLE,
}).pipe(Effect.provide(SqlTransaction.clientLayer), Effect.orDie);

/** Derived from the manifest: hard-coded ids go stale the moment a migration is added. */
const ENTITY_META_IDS = Object.keys(ENTITY_META).map((key) => [
  Number(key.slice(0, key.indexOf('_'))),
  key.slice(key.indexOf('_') + 1),
]);

const objectMetaColumns = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
  return columns.map((column) => column.name).sort();
});

const DESIRED_COLUMNS = [
  'createdAt',
  'deleted',
  'documentId',
  'entityKind',
  'objectId',
  'parent',
  'queueId',
  'queueNamespace',
  'queuePosition',
  'recordId',
  'source',
  'spaceId',
  'target',
  'typeDXN',
  'updatedAt',
  'version',
];

describe('index-core migrations', () => {
  for (const { name, init, manifest } of STORES) {
    // The initial migration runs against databases that already hold these tables. Nothing else
    // catches a missing clause: it does not change the resulting schema.
    test(`${name}: every CREATE in the initial migration is idempotent`, ({ expect }) => {
      const bare = SqlMigrations.splitStatements(init)
        .filter((statement) => /^CREATE\s/i.test(statement))
        .filter(
          (statement) =>
            !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
        )
        .map((statement) => statement.split('\n')[0]);

      expect(bare).toEqual([]);
    });

    // A file missing from the manifest never runs, silently. The manifest may hold more than the
    // files: entity-meta's 0002 is a code migration with no `.sql` behind it.
    test(`${name}: the manifest lists every migration file`, ({ expect }) => {
      const onDisk = readdirSync(new URL(`./${name}`, import.meta.url))
        .filter((entry) => entry.endsWith('.sql'))
        .map((entry) => entry.replace('.sql', ''));

      expect(onDisk.filter((file) => !(file in manifest))).toEqual([]);
    });
  }
});

describe('objectMeta vintages', () => {
  // The three database vintages in the field. All must converge on the shape the code consumes and
  // produces — the INSERT writes all 14 non-key columns and `SELECT *` reads them back.
  it.effect('fresh database gets the desired shape, and the column back-fill no-ops', () =>
    Effect.gen(function* () {
      expect(yield* migrateEntityMeta).toEqual(ENTITY_META_IDS);
      expect(yield* objectMetaColumns).toEqual(DESIRED_COLUMNS);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('oldest vintage — missing all four later columns — is upgraded with rows preserved', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE objectMeta (
        recordId INTEGER PRIMARY KEY AUTOINCREMENT,
        objectId TEXT NOT NULL,
        queueId TEXT NOT NULL DEFAULT '',
        spaceId TEXT NOT NULL,
        documentId TEXT NOT NULL DEFAULT '',
        entityKind TEXT NOT NULL,
        typeDXN TEXT NOT NULL,
        deleted INTEGER NOT NULL,
        source TEXT,
        target TEXT,
        version INTEGER NOT NULL
      )`;
      yield* sql`INSERT INTO objectMeta (objectId, spaceId, entityKind, typeDXN, deleted, version)
        VALUES ('o1', 's1', 'object', 'dxn:type:example', 0, 1)`;

      yield* migrateEntityMeta;

      expect(yield* objectMetaColumns).toEqual(DESIRED_COLUMNS);
      const rows = yield* sql<{ objectId: string; parent: string | null }>`SELECT objectId, parent FROM objectMeta`;
      expect(rows).toEqual([{ objectId: 'o1', parent: null }]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('partially migrated vintage — has parent, lacks the rest — gains only what is missing', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE objectMeta (
        recordId INTEGER PRIMARY KEY AUTOINCREMENT,
        objectId TEXT NOT NULL,
        queueId TEXT NOT NULL DEFAULT '',
        spaceId TEXT NOT NULL,
        documentId TEXT NOT NULL DEFAULT '',
        entityKind TEXT NOT NULL,
        typeDXN TEXT NOT NULL,
        deleted INTEGER NOT NULL,
        source TEXT,
        target TEXT,
        parent TEXT,
        version INTEGER NOT NULL
      )`;
      // The pre-existing column carries data that a blind ALTER-or-rebuild would lose.
      yield* sql`INSERT INTO objectMeta (objectId, spaceId, entityKind, typeDXN, deleted, version, parent)
        VALUES ('o1', 's1', 'object', 'dxn:type:example', 0, 1, 'parent-1')`;

      yield* migrateEntityMeta;

      expect(yield* objectMetaColumns).toEqual(DESIRED_COLUMNS);
      const rows = yield* sql<{ parent: string | null }>`SELECT parent FROM objectMeta`;
      expect(rows).toEqual([{ parent: 'parent-1' }]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('second run is a no-op on every vintage', () =>
    Effect.gen(function* () {
      yield* migrateEntityMeta;
      expect(yield* migrateEntityMeta).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
