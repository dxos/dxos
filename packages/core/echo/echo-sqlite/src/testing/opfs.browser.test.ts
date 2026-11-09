//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as SqlClient from 'effect/sql/SqlClient';

import { Filter, Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import { type SqliteDatabase as Db, SqliteDatabase } from '../database.ts';

const TYPES = [TestSchema.Person, TestSchema.Organization];

/**
 * Spike: does `@dxos/echo-sqlite` run in a browser against OPFS?
 *
 * The database runs on the MAIN thread and reaches OPFS through `OpfsWorker` over postMessage,
 * because `OpfsConfig` is worker-only — `AccessHandlePoolVFS` needs OPFS sync access handles,
 * which exist only in a worker. Keeping ECHO itself on the main thread is what lets
 * `@dxos/echo-react` bind to it directly.
 */

const spawnWorker = (): Worker => new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });

const closeWorker = async (worker: Worker): Promise<void> => {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    worker.addEventListener('message', (event: MessageEvent<[id: unknown]>) => {
      if (event.data[0] === 'closed') {
        clearTimeout(timeout);
        resolve();
      }
    });
    worker.postMessage(['close']);
  });
  worker.terminate();
};

/**
 * One database session on the OPFS file, with its own worker, so a later session reads what the
 * previous one left on disk rather than sharing its connection.
 */
type Probe = () => Promise<readonly { space_id: string; type_dxn: string; id: string }[]>;

/**
 * One SQLite file holds several spaces and `open` defaults to a fresh random space id, so every
 * session of one logical space must be handed the same one — which is what a DO-backed demo does
 * anyway, one stable space per Durable Object.
 */
const session = <A>(spaceId: SpaceId, body: (db: Db, rows: Probe) => Promise<A>): Promise<A> =>
  Effect.scoped(
    Effect.gen(function* () {
      const worker = yield* Effect.acquireRelease(
        Effect.sync(() => spawnWorker()),
        (active) => Effect.promise(() => closeWorker(active)),
      );

      const layer = SqliteClient.layer({ worker: Effect.succeed(worker) }).pipe(Layer.provideMerge(Reactivity.layer));

      return yield* Effect.gen(function* () {
        const db = yield* SqliteDatabase.open({ spaceId, types: TYPES });
        const sql = yield* SqlClient.SqlClient;
        // Diagnostic: what actually reached storage, independent of the query compiler.
        // `sql` is the resolved client, so the statement needs no further context.
        const rows: Probe = () =>
          EffectEx.runPromise(
            sql<{ space_id: string; type_dxn: string; id: string }>`
            SELECT space_id, type_dxn, id FROM echo_entities
          `.pipe(Effect.orDie),
          );
        return yield* Effect.promise(() => body(db, rows));
        // `Effect.scoped` ahead of `Effect.provide`: the latter builds the layer in a scope of its own
        // (`provideLayer` is `scopedWith`) that closes as soon as this effect returns, so a database
        // left in the OUTER scope would close — retrying a failed write — after its client was gone.
      }).pipe(Effect.scoped, Effect.provide(layer));
    }),
  ).pipe(EffectEx.runPromise);

describe('echo-sqlite on OPFS', () => {
  it('builds a graph, queries it, and reads it back in a new session', async () => {
    const spaceId = SpaceId.random();

    const orgId = await session(spaceId, async (db, rows) => {
      const org = db.add(Obj.make(TestSchema.Organization, { name: 'Cloudflare' }));
      db.add(
        Obj.make(TestSchema.Person, {
          name: 'Alice',
          username: 'alice',
          email: 'alice@example.com',
          tasks: [],
          employer: Ref.make(org),
        }),
      );
      db.add(
        Obj.make(TestSchema.Person, {
          name: 'Bob',
          username: 'bob',
          email: 'bob@example.com',
          tasks: [],
          employer: Ref.make(org),
        }),
      );
      await db.flush();

      // Did the writes reach storage at all? Distinguishes a write-path failure from a
      // query-compiler one — the whole point of the probe.
      const stored = await rows();
      expect({ count: stored.length, spaces: [...new Set(stored.map((row) => row.space_id))] }).toEqual({
        count: 3,
        spaces: [db.spaceId],
      });

      const people = await db.query(Filter.type(TestSchema.Person)).run();
      expect(people.map((person) => person.name).sort()).toEqual(['Alice', 'Bob']);

      return org.id;
    });

    // A fresh session, a fresh worker: everything below came off OPFS.
    await session(spaceId, async (db) => {
      const people = await db.query(Filter.type(TestSchema.Person)).run();
      expect(people.map((person) => person.name).sort()).toEqual(['Alice', 'Bob']);

      // Ref traversal — the thing that makes this a graph and not a table.
      const alice = people.find((person) => person.name === 'Alice')!;
      const employer = await alice.employer!.load();
      expect(employer.id).toEqual(orgId);
      expect(employer.name).toEqual('Cloudflare');

      // Full-text query: proves the browser wa-sqlite build has FTS5.
      expect((await db.query(Filter.text('alice@example')).run()).map((match) => match.id)).toEqual([alice.id]);
    });
  });
});
