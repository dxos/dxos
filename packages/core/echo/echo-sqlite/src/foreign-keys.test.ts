//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from './database.ts';

/**
 * Foreign keys are how an object is correlated across instances — `Obj.make` mints its own id and
 * takes no `id` option, so two peers cannot share one. Anything syncing into this backend depends
 * on a key surviving a reopen and on `Filter.foreignKeys` finding it.
 */

const SOURCE = 'test-source';
const TYPES = [TestSchema.Organization];

let dir: string;
let filename: string;
let spaceId: SpaceId;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-fk-'));
  filename = join(dir, `${randomUUID()}.db`);
  spaceId = SpaceId.random();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Each call is a fresh process's view: the connection closes before the next session opens. */
const session = <A>(body: (db: SqliteDatabase) => Promise<A>): Promise<A> =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ spaceId, types: TYPES });
      return yield* Effect.promise(() => body(db));
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.runPromise);

describe('foreign keys', () => {
  it('survive a reopen and are findable by filter', async () => {
    const key = { source: SOURCE, id: 'stable-key-1' };

    await session(async (db) => {
      db.add(Obj.make(TestSchema.Organization, { [Obj.Meta]: { keys: [key] }, name: 'Cloudflare' }));
      await db.flush();

      // Readable in the session that created it.
      const [found] = await db.query(Query.select(Filter.foreignKeys(TestSchema.Organization, [key]))).run();
      expect(found?.name).toEqual('Cloudflare');
      expect(Obj.getKeys(found!, SOURCE)[0]?.id).toEqual('stable-key-1');
    });

    // A new session reads it back off disk — this is the one sync actually depends on.
    await session(async (db) => {
      const all = await db.query(Filter.type(TestSchema.Organization)).run();
      expect(all).toHaveLength(1);
      expect(Obj.getKeys(all[0], SOURCE)[0]?.id).toEqual('stable-key-1');

      const [found] = await db.query(Query.select(Filter.foreignKeys(TestSchema.Organization, [key]))).run();
      expect(found?.name).toEqual('Cloudflare');
    });
  });

  it('a second import of the same key updates rather than duplicating', async () => {
    const key = { source: SOURCE, id: 'stable-key-2' };

    await session(async (db) => {
      db.add(Obj.make(TestSchema.Organization, { [Obj.Meta]: { keys: [key] }, name: 'First' }));
      await db.flush();
    });

    await session(async (db) => {
      const [existing] = await db.query(Query.select(Filter.foreignKeys(TestSchema.Organization, [key]))).run();
      expect(existing, 'the key must be found, or an importer creates a duplicate').toBeDefined();
      Obj.update(existing!, (draft) => {
        draft.name = 'Second';
      });
      await db.flush();

      const all = await db.query(Filter.type(TestSchema.Organization)).run();
      expect(all).toHaveLength(1);
      expect(all[0].name).toEqual('Second');
    });
  });
});
