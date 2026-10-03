//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as WasmSqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as SqlClient from 'effect/sql/SqlClient';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MessagePort as NodeMessagePort, type TransferListItem, Worker } from 'node:worker_threads';
import { bench, describe } from 'vitest';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from '../database.ts';
import { RemoteStoreDriver } from '../remote.ts';
import { type StoreDriver, makeLocalDriver, runWith } from '../store-driver.ts';
import { type StoreWorkerData } from './store-worker.ts';

// Compares one database across three placements of SQLite: in this thread, and on a worker thread behind
// an op-level or a statement-level RPC boundary. The worker loads the BUILT package, so build first:
//   moon run echo-sqlite:build && DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run src/testing/rpc.bench.ts
const OBJECTS = Number(process.env.ECHO_SQLITE_BENCH_OBJECTS ?? 10_000);
const ORGANIZATIONS = 100;
const TYPES = [TestSchema.Person, TestSchema.Organization];
const OPTIONS = { time: 1_000 };
const MODES = ['in-process', 'rpc: op', 'rpc: statement'] as const;
type Mode = (typeof MODES)[number];

type Placement = {
  /** A driver for the seeded space; the open-cost bench makes a fresh database per call. */
  driver: () => StoreDriver;
  db: SqliteDatabase;
  /** The driver under {@link db}'s placement, called directly. */
  store: StoreDriver;
};

type State = { spaceId: SpaceId; personIds: string[]; orgIds: string[]; placements: Record<Mode, Placement> };

let statePromise: Promise<State> | undefined;
let counter = 0;

const startWorker = (filename: string, mode: StoreWorkerData['mode']): MessagePort => {
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL('./store-worker.ts', import.meta.url), {
    workerData: { filename, mode, port: port2 },
    transferList: [port2].filter(isTransferable),
  });
  worker.unref();
  process.once('exit', () => void worker.terminate());
  return port1;
};

/** Node's global `MessageChannel` is the `worker_threads` one; TypeScript types it as the DOM's. */
const isTransferable = (port: MessagePort): port is MessagePort & TransferListItem => port instanceof NodeMessagePort;

const placement = (driver: () => StoreDriver, spaceId: SpaceId): Placement => ({
  driver,
  db: SqliteDatabase.make({ spaceId, types: TYPES, driver: driver() }),
  store: driver(),
});

/**
 * One seeded file shared by every placement; a lazy singleton because `bench()` does not await `beforeAll`.
 */
const ensureState = (): Promise<State> => {
  statePromise ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-rpc-bench-'));
    process.once('exit', () => rmSync(dir, { recursive: true, force: true }));
    const filename = join(dir, 'bench.db');
    const spaceId = SpaceId.random();

    const local = ManagedRuntime.make(SqliteClient.layer({ filename }).pipe(Layer.orDie));
    const localRun = runWith(await local.runPromise(Effect.context<SqlClient.SqlClient>()));
    const seed = SqliteDatabase.make({ spaceId, types: TYPES, driver: makeLocalDriver(spaceId, localRun) });
    const orgs = Array.from({ length: ORGANIZATIONS }, (_, index) =>
      seed.add(Obj.make(TestSchema.Organization, { name: `Organization ${index}` })),
    );
    const personIds: string[] = [];
    for (let index = 0; index < OBJECTS; index++) {
      const person = seed.add(
        Obj.make(TestSchema.Person, {
          name: `Person ${index}`,
          email: `person${index}@example.com`,
          age: index % 90,
          employer: Ref.make(orgs[index % ORGANIZATIONS]),
        }),
      );
      personIds.push(person.id);
    }
    await seed.close();

    const opPort = startWorker(filename, 'op');
    const statementPort = startWorker(filename, 'statement');
    const statement = ManagedRuntime.make(
      WasmSqliteClient.layer({ worker: Effect.succeed(statementPort) }).pipe(Layer.orDie),
    );
    const statementRun = runWith(await statement.runPromise(Effect.context<SqlClient.SqlClient>()));

    return {
      spaceId,
      personIds,
      orgIds: orgs.map((org) => org.id),
      placements: {
        'in-process': placement(() => makeLocalDriver(spaceId, localRun), spaceId),
        'rpc: op': placement(() => new RemoteStoreDriver(opPort, spaceId), spaceId),
        'rpc: statement': placement(() => makeLocalDriver(spaceId, statementRun), spaceId),
      },
    };
  })();
  return statePromise;
};

const pick = <T>(values: readonly T[]): T => values[counter++ % values.length];

/** Benches `run` once per placement, so vitest reports them side by side. */
const compare = (name: string, run: (placement: Placement, state: State) => Promise<unknown>, time = OPTIONS.time) =>
  describe(name, () => {
    for (const mode of MODES) {
      bench(
        mode,
        async () => {
          const state = await ensureState();
          await run(state.placements[mode], state);
        },
        { time },
      );
    }
  });

describe(
  `echo-sqlite across an RPC boundary (${OBJECTS.toLocaleString()} people)`,
  { tags: ['manual'], timeout: 600_000 },
  () => {
    compare('open + first page (limit 10)', async ({ driver }, { spaceId }) => {
      const db = SqliteDatabase.make({ spaceId, types: TYPES, driver: driver() });
      await db.query(Query.select(Filter.type(TestSchema.Person)).limit(10)).run();
      await db.close();
    });

    compare('query: type, limit 10', ({ db }) =>
      db.query(Query.select(Filter.type(TestSchema.Person)).limit(10)).run(),
    );

    compare('query: property eq (1 match)', ({ db }) =>
      db.query(Filter.type(TestSchema.Person, { name: `Person ${counter++ % OBJECTS}` })).run(),
    );

    compare('query: reference traversal (10 → employers)', ({ db }) =>
      db.query(Query.select(Filter.type(TestSchema.Person)).limit(10).reference('employer')).run(),
    );

    compare(
      `query: hydrate all ${OBJECTS.toLocaleString()} people`,
      ({ db }) => db.query(Filter.type(TestSchema.Person)).run(),
      3_000,
    );

    // Below the database: the storage round trip alone, which is all the boundary changes for a read.
    compare('store: load 1 row (no hydration)', ({ store }, { personIds }) => store.load(pick(personIds)));

    compare('store: query 100 rows (no hydration)', ({ store }) =>
      store.query({ sql: 'SELECT id, body FROM echo_entities LIMIT 100', params: [] }),
    );

    compare('insert 1 object + flush', async ({ db }) => {
      db.add(Obj.make(TestSchema.Organization, { name: `New ${counter++}` }));
      await db.flush();
    });

    compare('insert 100 objects + flush (one batch)', async ({ db }) => {
      for (let index = 0; index < 100; index++) {
        db.add(Obj.make(TestSchema.Organization, { name: `Batch ${counter++}` }));
      }
      await db.flush();
    });
  },
);
