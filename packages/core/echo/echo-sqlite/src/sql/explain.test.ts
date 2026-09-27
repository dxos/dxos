//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Filter, Obj, Order, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { SqliteDatabase } from '../database.ts';

const withDatabase = (body: (db: SqliteDatabase) => Promise<void>) =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: [TestSchema.Person, TestSchema.Organization] });
      yield* Effect.promise(() => body(db));
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' })));

/** Steps that touch a base table; SQLite reports a full pass as `SCAN <alias>`. */
const tableSteps = (plan: readonly string[]) =>
  plan.filter((line) => /^(SCAN|SEARCH) (e|r|t|s|c|p|d|rel)\b/.test(line));

describe('Compiled SQL plans (T-4)', () => {
  it.effect('every table access is an index seek, never a scan', () =>
    withDatabase(async (db) => {
      const queries = {
        type: Filter.type(TestSchema.Person),
        props: Filter.type(TestSchema.Person, { name: 'Alice' }),
        id: Filter.id(Obj.make(TestSchema.Person, {}).id),
        reference: Query.select(Filter.type(TestSchema.Person)).reference('employer'),
        incoming: Query.select(Filter.type(TestSchema.Organization)).referencedBy(TestSchema.Person, 'employer'),
        children: Query.select(Filter.type(TestSchema.Organization)).children(),
        ordered: Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc')).limit(10),
      };
      for (const [name, query] of Object.entries(queries)) {
        const steps = tableSteps(await db.explain(query));
        expect({ name, scans: steps.filter((line) => line.startsWith('SCAN')) }).toEqual({ name, scans: [] });
        expect(steps.length).toBeGreaterThan(0);
      }
    }),
  );

  it.effect('selects by type through the type index, and traverses refs through the ref keys', () =>
    withDatabase(async (db) => {
      expect(await db.explain(Filter.type(TestSchema.Person))).toContain(
        'SEARCH e USING INDEX echo_entities_type (space_id=? AND type_dxn=?)',
      );
      expect(await db.explain(Query.select(Filter.type(TestSchema.Person)).reference('employer'))).toContain(
        'SEARCH r USING COVERING INDEX sqlite_autoindex_echo_refs_1 (space_id=? AND source_id=? AND prop_path=?)',
      );
      expect(
        await db.explain(
          Query.select(Filter.type(TestSchema.Organization)).referencedBy(TestSchema.Person, 'employer'),
        ),
      ).toContainEqual(
        expect.stringMatching(/^SEARCH r USING (COVERING )?INDEX echo_refs_target \(space_id=\? AND target_id=\?/),
      );
    }),
  );
});

describe('One statement per query (T-5)', () => {
  it.effect('a composite query executes as exactly one bound statement', () =>
    withDatabase(async (db) => {
      const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
      for (const name of ['Alice', 'Bob', 'Carol']) {
        db.add(Obj.make(TestSchema.Person, { name, employer: Ref.make(org) }));
      }
      await db.flush();

      const query = Query.all(
        Query.select(Filter.type(TestSchema.Person, { name: Filter.in('Alice', 'Bob') })).reference('employer'),
        Query.select(Filter.type(TestSchema.Person, { name: 'Carol' })),
      )
        .orderBy(Order.natural())
        .limit(10);

      const compiled = db.compile(query);
      expect(compiled.sql.match(/\bSELECT\b/g)?.length).toBeGreaterThan(1);
      // Values are bound, never spliced into the text.
      for (const value of ['Alice', 'Bob', 'Carol', db.spaceId]) {
        expect(compiled.sql).not.toContain(value);
        expect(JSON.stringify(compiled.params)).toContain(value);
      }

      const before = db.diagnostics();
      const results = await db.query(query).run();
      const after = db.diagnostics();
      expect(results).toHaveLength(2);
      expect(after.queries - before.queries).toBe(1);
      expect(after.loads - before.loads).toBe(0);
    }),
  );
});
