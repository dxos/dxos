//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

import * as FactStoreLive from '../store/fact-store-live.ts';
import { FactStore } from '../store/fact-store.ts';
import * as Vocab from '../types/Vocab.ts';
import init from './0001_init.sql?raw';
import { MIGRATIONS, MIGRATIONS_TABLE } from './index.ts';

/** Mirrors the store's `migrate`, so the test exercises the production configuration. */
const migrate = Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
  Effect.orDie,
);

/** Derived from the manifest: hard-coded ids go stale the moment a migration is added. */
const ids = Object.keys(MIGRATIONS).map((key) => [
  Number(key.slice(0, key.indexOf('_'))),
  key.slice(key.indexOf('_') + 1),
]);

describe('rdf migrations', () => {
  // The initial migration runs against databases that already hold these tables — anything created
  // before migration tracking existed. Nothing else catches a missing clause: it does not change the
  // resulting schema, so equivalence assertions are blind to it.
  test('every CREATE in the initial migration is idempotent', () => {
    const bare = SqlMigrations.splitStatements(init)
      .filter((statement) => /^CREATE\s/i.test(statement))
      .filter(
        (statement) =>
          !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
      )
      .map((statement) => statement.split('\n')[0]);

    expect(bare).toEqual([]);
  });

  // A file missing from the manifest never runs, silently — the migrator only sees what it lists.
  test('the manifest lists every migration file', () => {
    const onDisk = readdirSync(new URL('.', import.meta.url))
      .filter((entry) => /^\d+_.+\.(sql|ts)$/.test(entry) && !entry.endsWith('.test.ts'))
      .map((entry) => entry.replace(/\.(sql|ts)$/, ''))
      .sort();

    expect(onDisk).toEqual(Object.keys(MIGRATIONS).sort());
  });

  // A database from before migration tracking already holds these tables and has no history, so the
  // migrator runs migration 1 against it: it must apply as a recorded no-op.
  test('applies to a legacy database, and a second run is a no-op', async () => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* SqlMigrations.apply(init);
        expect(yield* migrate).toEqual(ids);
        expect(yield* migrate).toEqual([]);
      }).pipe(Effect.provide(layerMemory), Effect.orDie),
    );
  });

  // Every fact stored before named graphs is reified; after the migration it reads back as the same fact.
  test('rewrites reified facts as named graphs that read back as the same facts', async () => {
    const facts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // The database as the reified release left it: migration 1 applied, facts written.
        yield* Migrator.make({})({
          loader: Migrator.fromRecord({ '0001_init': MIGRATIONS['0001_init'] }),
          table: MIGRATIONS_TABLE,
        });
        for (const [p, o, oType] of LEGACY) {
          yield* sql`INSERT INTO triples (s, p, o, oType, g) VALUES (${FACT_NODE}, ${p}, ${o}, ${oType}, '')`;
        }
        expect(yield* migrate).toEqual(ids.slice(1));
        return yield* Effect.gen(function* () {
          const store = yield* FactStore;
          return yield* store.query({ entity: 'did:key:z6MkRich' });
        }).pipe(Effect.provide(FactStoreLive.layer));
      }).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' })), Effect.orDie),
    );
    expect(facts).toEqual([
      {
        id: 'team#1',
        assertion: {
          subject: { kind: 'entity', entity: 'did:key:z6MkRich', label: 'Rich Burdon' },
          predicate: 'has role',
          predicateIri: 'https://dxos.org/ontology/hasRole',
          object: { kind: 'entity', entity: 'founder', label: 'Founder' },
          quote: 'Rich is on the DXOS team as Founder',
        },
        factuality: { value: 'CT+', polarity: '+' },
        attribution: {
          agent: 'did:key:z6MkDima',
          source: 'https://dxos.org/team',
          generatedAtTime: '2026-10-13T07:53:53Z',
        },
        recordedAt: '2026-10-13T07:53:53Z',
        extractor: { id: 'default', model: 'm', version: '1' },
        sourceHash: 'e7f0d44f',
      },
    ]);
  });
});

const FACT_NODE = `${Vocab.FACT}${encodeURIComponent('team#1')}`;
const entity = (key: string) => `${Vocab.ENTITY}${encodeURIComponent(key)}`;

/** A fact as the reified store held it, including the slug-wrapped DIDs it wrote for members. */
const LEGACY: [string, string, 'iri' | 'literal'][] = [
  [`${Vocab.SX}subject`, entity('did:key:z6MkRich'), 'iri'],
  [`${Vocab.SX}predicate`, 'is on the team as', 'literal'],
  [`${Vocab.SX}object`, entity('founder'), 'iri'],
  [`${Vocab.SX}subjectLabel`, 'Rich Burdon', 'literal'],
  [`${Vocab.SX}objectLabel`, 'Founder', 'literal'],
  [`${Vocab.SX}factuality`, 'CT+', 'literal'],
  [`${Vocab.SX}polarity`, '+', 'literal'],
  [`${Vocab.PROV}wasDerivedFrom`, 'https://dxos.org/team', 'literal'],
  [`${Vocab.PROV}generatedAtTime`, '2026-10-13T07:53:53Z', 'literal'],
  [`${Vocab.PROV}wasAttributedTo`, entity('did:key:z6MkDima'), 'iri'],
  [`${Vocab.SX}recordedAt`, '2026-10-13T07:53:53Z', 'literal'],
  [`${Vocab.SX}sourceHash`, 'e7f0d44f', 'literal'],
  [`${Vocab.SX}extractorId`, 'default', 'literal'],
  [`${Vocab.SX}extractorModel`, 'm', 'literal'],
  [`${Vocab.SX}extractorVersion`, '1', 'literal'],
  [`${Vocab.SX}quote`, 'Rich is on the DXOS team as Founder', 'literal'],
];
