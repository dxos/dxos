//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as SqlClient from 'effect/sql/SqlClient';
import { afterAll, bench, describe } from 'vitest';

import { Context } from '@dxos/context';
import { Filter, Obj, Order, Query, Ref, Type } from '@dxos/echo';
import { ATTR_DELETED, ATTR_META, ATTR_TYPE, StaticRefResolver } from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import {
  EntityMetaIndex,
  IndexedObjectSource,
  IndexEngine,
  type IndexerObject,
  ObjectSnapshotIndex,
} from '@dxos/index-core';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type QueryService } from '@dxos/protocols/rpc';
import * as Jsonb from '@dxos/util/Jsonb';

import { AutomergeHost } from '../automerge/index.ts';
import { SpaceStateManager } from '../db-host/space-state-manager.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { QueryExecutor } from './query-executor.ts';

//
// What storing object snapshots costs at every step between the indexer and the client, over a feed of
// N objects shaped like real ones (text with non-ASCII, a number to filter and order on, tags, a ref,
// nested data, `@meta` keys). Each scale is a `describe` of its own so the rows read as a table per N.
//
//   write    `ObjectSnapshotIndex.update` upserting all N snapshots.
//   query    the `sql` executor end to end (compile, run, ship results) for a full read, a property
//            predicate, and an order-by-property with a limit.
//   interop  every consumer that wants JSON from the store: the parsed-snapshot reader, the full-text
//            index's change feed, the column rendered as JSON text by SQLite (alone, and parsed), and
//            the column read raw and decoded in JS.
//   transport the structured clone that carries N result bodies from the worker to the tab.
//   client   turning N result bodies into objects: the text parse against the JSONB decode, and each
//            followed by construction (`Obj.fromJSON` against the one-pass `Obj.fromJSONB`).
//
// Scales come from `SNAPSHOT_BENCH_COUNTS` (comma-separated, default `1000,10000`). Run with
// `moon run echo-host:bench`, or a subset with `-- -t <row name>`.
//

const COUNTS = (process.env.SNAPSHOT_BENCH_COUNTS ?? '1000,10000').split(',').map((value) => {
  const count = Number(value.trim());
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error(`SNAPSHOT_BENCH_COUNTS must be positive integers, got ${value}`);
  }
  return count;
});

const TYPE = DXN.make('com.example.type.benchItem', '0.1.0');

/** The schema of the bench's objects, so the client rows can measure the schema-decode path real clients take. */
class BenchItem extends Type.makeObject<BenchItem>(TYPE)(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Number),
    done: Schema.optional(Schema.Boolean),
    estimate: Schema.optional(Schema.Number),
    tags: Schema.optional(Schema.Array(Schema.String)),
    assignee: Schema.optional(Ref.Ref(TestSchema.Person)),
    location: Schema.optional(
      Schema.Struct({
        lat: Schema.Number,
        lng: Schema.Number,
        label: Schema.Struct({ short: Schema.String, long: Schema.String }),
      }),
    ),
    checklist: Schema.optional(Schema.Array(Schema.Struct({ text: Schema.String, done: Schema.Boolean }))),
  }),
) {}

const schemaResolver = new StaticRefResolver().addSchema(BenchItem);
const PRIORITY_LEVELS = 5;
const ORDER_LIMIT = 20;
const TAGS = ['urgent', 'backlog', 'design', 'infra', 'review', 'blocked'];
const BENCH_OPTIONS = { time: 1_000, warmupIterations: 2 };

let sink: unknown;

/** A feed object of the shape the indexer stores; `index` makes each one distinct and deterministic. */
const makeObject = (id: EntityId, index: number, assignee: EntityId): Obj.JSON => ({
  id,
  [ATTR_TYPE]: TYPE,
  [ATTR_DELETED]: false,
  [ATTR_META]: { keys: [{ source: 'github.com', id: `issue-${index}` }] },
  title: `Item ${index}: ремонт — ${index % 7 === 0 ? '設計レビュー' : 'review the design'} 🚀`,
  description: `Line one of item ${index}.\nIt carries "quotes", a backslash \\ and a tab\t. `.repeat(6),
  priority: (index % PRIORITY_LEVELS) + 1,
  done: index % 3 === 0,
  estimate: index * 0.25,
  tags: TAGS.filter((_, tagIndex) => (index + tagIndex) % 3 === 0),
  assignee: { '/': `dxn:echo:@:${assignee}` },
  location: { lat: 51.5 + index / 1e6, lng: -0.12 - index / 1e6, label: { short: 'LDN', long: 'London' } },
  checklist: Array.from({ length: 4 }, (_, step) => ({ text: `Step ${step}`, done: step < index % 4 })),
});

type Fixture = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  sql: SqlClient.SqlClient;
  indexEngine: IndexEngine;
  objects: IndexerObject[];
  recordIds: number[];
  feedUri: string;
  /** Every snapshot as JSON text and as JSONB, read through SQLite so either storage format yields both. */
  documentJson: string[];
  documentJsonb: Uint8Array[];
  dispose: () => Promise<void>;
};

const setup = async (count: number): Promise<Fixture> => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const spaceId = SpaceId.random();
  const queueId = EntityId.random();
  const ids = Array.from({ length: count }, () => EntityId.random()).sort();
  const { sql, indexEngine, objects } = await RuntimeProvider.runPromise(runtime)(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const indexEngine = new IndexEngine(sql);
      yield* indexEngine.migrate();
      const objects = ids.map((id, index): IndexerObject => ({
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        queuePosition: index,
        createdAt: null,
        updatedAt: 1,
        data: makeObject(id, index, ids[(index * 7) % count]),
      }));
      const meta = new EntityMetaIndex(sql);
      yield* meta.update(objects);
      yield* meta.lookupRecordIds(objects);
      yield* new ObjectSnapshotIndex(sql).update(objects);
      return { sql, indexEngine, objects };
    }),
  );
  const recordIds = objects.map((object) => {
    if (object.recordId === null) {
      throw new Error('record id not assigned');
    }
    return object.recordId;
  });
  const fixture: Fixture = {
    runtime,
    sql,
    indexEngine,
    objects,
    recordIds,
    feedUri: EID.make({ spaceId, entityId: queueId }),
    documentJson: [],
    documentJsonb: [],
    dispose,
  };
  const rows = await run(
    fixture,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql<{ text: string; binary: Uint8Array }>`
        SELECT json(snapshot) AS text, jsonb(snapshot) AS binary FROM objectSnapshot ORDER BY recordId`;
    }),
  );
  fixture.documentJson = rows.map((row) => row.text);
  fixture.documentJsonb = rows.map((row) => row.binary);
  if (rows.length !== count) {
    throw new Error(`expected ${count} snapshots, got ${rows.length}`);
  }
  return fixture;
};

const runQuery = async (fixture: Fixture, query: Query.Any): Promise<QueryService.QueryResult[]> => {
  const executor = new QueryExecutor({
    indexEngine: fixture.indexEngine,
    runtime: fixture.runtime,
    automergeHost: new AutomergeHost({ runtime: fixture.runtime }),
    spaceStateManager: new SpaceStateManager({ runtime: fixture.runtime }),
    queryId: 'bench',
    query: query.from([{ _tag: 'feed', feedUri: fixture.feedUri }]).ast,
    reactivity: QueryReactivity.ONE_SHOT,
    executor: 'sql',
    sql: fixture.sql,
  });
  await executor.open();
  try {
    await executor.execQuery();
    return await executor.getResults();
  } finally {
    await executor.close();
  }
};

const run = <A>(fixture: Fixture, effect: Effect.Effect<A, unknown, SqlClient.SqlClient>): Promise<A> =>
  RuntimeProvider.runPromise(fixture.runtime)(effect);

for (const count of COUNTS) {
  describe(`snapshot storage (N=${count})`, { tags: ['manual'], timeout: 600_000 }, () => {
    // `vitest bench` runs no `beforeAll`, so the fixture is built on first use; tinybench's warm-up absorbs it.
    let pending: Promise<Fixture> | undefined;
    const getFixture = (): Promise<Fixture> => (pending ??= setup(count));

    afterAll(async () => {
      await (await pending)?.dispose();
    });

    bench(
      'write: upsert all snapshots',
      async () => {
        const fixture = await getFixture();
        await run(fixture, new ObjectSnapshotIndex(fixture.sql).update(fixture.objects));
      },
      BENCH_OPTIONS,
    );

    bench(
      'query: full read',
      async () => {
        const fixture = await getFixture();
        sink = await runQuery(fixture, Query.select(Filter.everything()));
      },
      BENCH_OPTIONS,
    );

    bench(
      'query: property predicate',
      async () => {
        const fixture = await getFixture();
        sink = await runQuery(fixture, Query.select(Filter.props({ priority: 3 })));
      },
      BENCH_OPTIONS,
    );

    bench(
      'query: order by property, limit',
      async () => {
        const fixture = await getFixture();
        sink = await runQuery(
          fixture,
          Query.select(Filter.everything()).orderBy(Order.property('priority', 'desc')).limit(ORDER_LIMIT),
        );
      },
      BENCH_OPTIONS,
    );

    bench(
      'interop: parsed snapshots (querySnapshotsJSON)',
      async () => {
        const fixture = await getFixture();
        sink = await run(fixture, new ObjectSnapshotIndex(fixture.sql).querySnapshotsJSON(fixture.recordIds));
      },
      BENCH_OPTIONS,
    );

    bench(
      'interop: full-text index change feed',
      async () => {
        const fixture = await getFixture();
        const source = new IndexedObjectSource(fixture.sql);
        let total = 0;
        let cursors: Parameters<IndexedObjectSource['getChangedObjects']>[1] = [];
        while (true) {
          const batch = await run(fixture, source.getChangedObjects(Context.default(), cursors));
          if (batch.objects.length === 0) {
            break;
          }
          total += batch.objects.length;
          cursors = batch.cursors;
        }
        sink = total;
      },
      BENCH_OPTIONS,
    );

    bench(
      'interop: column as JSON text',
      async () => {
        const fixture = await getFixture();
        sink = await run(
          fixture,
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            return yield* sql<{ text: string }>`SELECT json(snapshot) AS text FROM objectSnapshot`;
          }),
        );
      },
      BENCH_OPTIONS,
    );

    bench(
      'transport: clone documentJson to the tab',
      async () => {
        const fixture = await getFixture();
        sink = structuredClone(fixture.documentJson);
      },
      BENCH_OPTIONS,
    );

    bench(
      'transport: clone documentJsonb to the tab',
      async () => {
        const fixture = await getFixture();
        sink = structuredClone(fixture.documentJsonb);
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: parse documentJson',
      async () => {
        const fixture = await getFixture();
        sink = fixture.documentJson.map((json) => JSON.parse(json));
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: decode documentJsonb',
      async () => {
        const fixture = await getFixture();
        sink = fixture.documentJsonb.map((jsonb) => Jsonb.decode(jsonb));
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: parse documentJson + Obj.fromJSON',
      async () => {
        const fixture = await getFixture();
        const objects = [];
        for (const json of fixture.documentJson) {
          objects.push(await Obj.fromJSON(JSON.parse(json)));
        }
        sink = objects;
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: Obj.fromJSONB',
      async () => {
        const fixture = await getFixture();
        const objects = [];
        for (const jsonb of fixture.documentJsonb) {
          objects.push(await Obj.fromJSONB(jsonb));
        }
        sink = objects;
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: parse documentJson + Obj.fromJSON (schema)',
      async () => {
        const fixture = await getFixture();
        const objects = [];
        for (const json of fixture.documentJson) {
          objects.push(await Obj.fromJSON(JSON.parse(json), { refResolver: schemaResolver }));
        }
        sink = objects;
      },
      BENCH_OPTIONS,
    );

    bench(
      'client: Obj.fromJSONB (schema)',
      async () => {
        const fixture = await getFixture();
        const objects = [];
        for (const jsonb of fixture.documentJsonb) {
          objects.push(await Obj.fromJSONB(jsonb, { refResolver: schemaResolver }));
        }
        sink = objects;
      },
      BENCH_OPTIONS,
    );

    bench(
      'interop: JSONB column as JSON text, parsed',
      async () => {
        const fixture = await getFixture();
        const rows = await run(
          fixture,
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            return yield* sql<{ text: string }>`SELECT json(snapshot) AS text FROM objectSnapshot`;
          }),
        );
        sink = rows.map((row) => JSON.parse(row.text));
      },
      BENCH_OPTIONS,
    );

    bench(
      'interop: column read raw, decoded in JS',
      async () => {
        const fixture = await getFixture();
        const rows = await run(
          fixture,
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            return yield* sql<{ snapshot: Uint8Array | string }>`SELECT snapshot FROM objectSnapshot`;
          }),
        );
        sink = rows.map((row) =>
          typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : Jsonb.decode(row.snapshot),
        );
      },
      BENCH_OPTIONS,
    );
  });
}

afterAll(() => {
  // Keeps every row's result observable so V8 cannot drop the work that produced it.
  globalThis.__snapshotBenchSink = sink;
});

declare global {
  // eslint-disable-next-line no-var
  var __snapshotBenchSink: unknown;
}
