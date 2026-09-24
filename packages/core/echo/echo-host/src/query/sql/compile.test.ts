//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Aggregate, Filter, Order, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
} from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';
import { EntityMetaIndex, type IndexerObject, ObjectSnapshotIndex, ReverseRefIndex } from '@dxos/index-core';
import { DXN, EID, EntityId, SpaceId, type URI } from '@dxos/keys';

import { QueryPlanner } from '../query-planner.ts';
import { compilePlan, planDeclinedByCompiler } from './compile.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));

/** Subquery planner the compiler takes by injection; see `PlanSubquery`. */
const planSubquery = (query: QueryAST.Query) => new QueryPlanner().createPlan(query);

const TASK = DXN.make('com.example.type.task', '0.1.0');
const PROJECT = DXN.make('com.example.type.project', '0.1.0');
const PERSON = DXN.make('com.example.type.person', '0.1.0');
const HAS_MANAGER = DXN.make('com.example.type.hasManager', '0.1.0');

type Fixture = {
  spaceId: SpaceId;
  ids: Record<string, EntityId>;
};

/** Seeds the three index tables the compiler reads, the way `IndexEngine.#update` would. */
const seed = Effect.gen(function* () {
  const sqlClient = yield* SqlClient.SqlClient;
  const meta = new EntityMetaIndex(sqlClient);
  const bodies = new ObjectSnapshotIndex(sqlClient);
  const refs = new ReverseRefIndex(sqlClient);
  yield* meta.migrate();
  yield* bodies.migrate();
  yield* refs.migrate();

  const spaceId = SpaceId.random();
  const ids = Object.fromEntries(
    ['project', 'deletedProject', 't1', 't2', 't3', 't4', 'alice', 'bob', 'rel'].map((name) => [
      name,
      EntityId.random(),
    ]),
  ) as Fixture['ids'];
  const ref = (id: EntityId) => ({ '/': EID.make({ entityId: id }) });
  const doc = (
    id: EntityId,
    type: URI.URI,
    data: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ): IndexerObject => ({
    spaceId,
    documentId: `doc-${id}`,
    queueId: null,
    queueNamespace: null,
    queuePosition: null,
    recordId: null,
    createdAt: 1000,
    updatedAt: 2000,
    data: { id, [ATTR_TYPE]: type, [ATTR_DELETED]: false, ...extra, ...data },
  });
  const objects: IndexerObject[] = [
    doc(ids.project, PROJECT, { name: 'live' }),
    doc(ids.deletedProject, PROJECT, { name: 'gone' }, { [ATTR_DELETED]: true }),
    doc(
      ids.t1,
      TASK,
      { title: 'alpha', priority: 2, due: -1, tags: ['a', 'b'], assignee: ref(ids.alice) },
      { [ATTR_PARENT]: EID.make({ entityId: ids.project }) },
    ),
    doc(
      ids.t2,
      TASK,
      { title: 'beta', priority: 1, tags: ['b'], assignee: ref(ids.bob) },
      { [ATTR_PARENT]: EID.make({ entityId: ids.deletedProject }) },
    ),
    doc(ids.t3, TASK, { title: 'gamma', priority: 3, due: 3_600_001, tags: [], assignee: ref(ids.alice) }),
    doc(ids.t4, TASK, {
      title: 'delta',
      due: 'soon',
      tags: ['a'],
      done: true,
      [ATTR_META]: { keys: [{ source: 'github.com', id: '42' }] },
    }),
    doc(ids.alice, PERSON, { name: 'alice' }),
    doc(ids.bob, PERSON, { name: 'bob' }),
    doc(
      ids.rel,
      HAS_MANAGER,
      {},
      {
        [ATTR_RELATION_SOURCE]: EID.make({ entityId: ids.alice }),
        [ATTR_RELATION_TARGET]: EID.make({ entityId: ids.bob }),
      },
    ),
  ];
  yield* meta.update(objects);
  yield* meta.lookupRecordIds(objects);
  yield* bodies.update(objects);
  yield* refs.update(objects);
  return { spaceId, ids } satisfies Fixture;
});

const run = (fixture: Fixture, query: Query.Any) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const plan = new QueryPlanner().createPlan(query.ast);
    const compiled = compilePlan(sql, plan, planSubquery);
    if (process.env.DX_DEBUG_SQL) {
      // eslint-disable-next-line no-console
      console.log(compiled.sql);
    }
    const rows = yield* compiled.statement;
    return { rows, sql: compiled.sql };
  });

const names = (fixture: Fixture, ids: readonly string[]) =>
  ids.map((id) => Object.entries(fixture.ids).find(([, value]) => value === id)?.[0] ?? id);

describe('SqlPlanCompiler', () => {
  it.effect('selects a type and filters on properties, excluding deleted and cascade-deleted rows', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const { rows } = yield* run(fixture, Query.select(Filter.type(TASK, { title: Filter.neq('zzz') })).from(scope));
      // t2's parent is deleted, so it is deleted transitively.
      expect(
        names(
          fixture,
          rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['t1', 't3', 't4']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('typed comparisons, contains, in and has-parent', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const priority = yield* run(fixture, Query.select(Filter.type(TASK, { priority: Filter.gt(1) })).from(scope));
      expect(
        names(
          fixture,
          priority.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['t1', 't3']);

      const tagged = yield* run(fixture, Query.select(Filter.type(TASK, { tags: Filter.contains('a') })).from(scope));
      expect(
        names(
          fixture,
          tagged.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['t1', 't4']);

      const missing = yield* run(
        fixture,
        Query.select(Filter.type(TASK, { priority: Filter.eq(undefined) })).from(scope),
      );
      expect(
        names(
          fixture,
          missing.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t4']);

      const done = yield* run(fixture, Query.select(Filter.type(TASK, { done: Filter.eq(true) })).from(scope));
      expect(
        names(
          fixture,
          done.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t4']);

      const roots = yield* run(
        fixture,
        Query.select(Filter.and(Filter.type(TASK), Filter.hasParent(false))).from(scope),
      );
      expect(
        names(
          fixture,
          roots.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['t3', 't4']);
    }).pipe(Effect.provide(TestLayer)),
  );

  // `objectSnapshot` strips `@meta` from document rows, so these predicates have nothing to read
  // there and the executor sends the plan to the in-memory path instead.
  it.effect('declines plans whose filters read object meta', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const planner = new QueryPlanner();
      const planSubquery = (query: QueryAST.Query) => planner.createPlan(query);
      const plan = (query: Query.Any) => planner.createPlan(query.ast);

      expect(planDeclinedByCompiler(plan(Query.select(Filter.type(TASK)).from(scope)), planSubquery)).toBe(false);
      expect(
        planDeclinedByCompiler(
          plan(Query.select(Filter.foreignKeys(TASK, [{ source: 'github.com', id: '42' }])).from(scope)),
          planSubquery,
        ),
      ).toBe(true);
      expect(
        planDeclinedByCompiler(plan(Query.select(Filter.key('example.com/type/Contact')).from(scope)), planSubquery),
      ).toBe(true);
      // A meta predicate nested under a union is still a meta predicate.
      expect(
        planDeclinedByCompiler(
          plan(
            Query.all(
              Query.select(Filter.type(TASK)),
              Query.select(Filter.foreignKeys(TASK, [{ source: 'github.com', id: '42' }])),
            ).from(scope),
          ),
          planSubquery,
        ),
      ).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('orders by property with nulls last and applies limit and skip', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const ordered = yield* run(
        fixture,
        Query.select(Filter.type(TASK)).orderBy(Order.property<{ priority: number }>('priority', 'desc')).from(scope),
      );
      expect(
        names(
          fixture,
          ordered.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t3', 't1', 't4']);

      const page = yield* run(
        fixture,
        Query.select(Filter.type(TASK))
          .orderBy(Order.property<{ title: string }>('title', 'asc'))
          .skip(1)
          .limit(1)
          .from(scope),
      );
      expect(
        names(
          fixture,
          page.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t4']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('traverses references, relations and hierarchy', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      // t2 is cascade-deleted with its project, so bob is reached by no live task.
      const assignees = yield* run(
        fixture,
        Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(scope),
      );
      expect(
        names(
          fixture,
          assignees.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['alice']);

      const withDeleted = yield* run(
        fixture,
        Query.select(Filter.type(TestSchema.Task)).reference('assignee').options({ deleted: 'include' }).from(scope),
      );
      expect(
        names(
          fixture,
          withDeleted.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['alice', 'bob']);

      const referrers = yield* run(
        fixture,
        Query.select(Filter.id(fixture.ids.alice)).referencedBy(TestSchema.Task, 'assignee').from(scope),
      );
      expect(
        names(
          fixture,
          referrers.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['t1', 't3']);

      const relations = yield* run(
        fixture,
        Query.select(Filter.id(fixture.ids.alice)).sourceOf(TestSchema.HasManager).from(scope),
      );
      expect(
        names(
          fixture,
          relations.rows.map((row) => row.objectId),
        ),
      ).toEqual(['rel']);

      const children = yield* run(fixture, Query.select(Filter.id(fixture.ids.project)).children().from(scope));
      expect(
        names(
          fixture,
          children.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t1']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('unions and set differences', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const union = yield* run(
        fixture,
        Query.all(Query.select(Filter.type(PERSON)), Query.select(Filter.type(PROJECT))).from(scope),
      );
      expect(
        names(
          fixture,
          union.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['alice', 'bob', 'project']);

      const without = yield* run(
        fixture,
        Query.without(
          Query.select(Filter.type(TASK)),
          Query.select(Filter.type(TASK, { tags: Filter.contains('a') })),
        ).from(scope),
      );
      expect(
        names(
          fixture,
          without.rows.map((row) => row.objectId),
        ),
      ).toEqual(['t3']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('collapses groups with counts to one row each, ordered by first appearance', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const { rows } = yield* run(
        fixture,
        Query.select(Filter.type(TASK))
          .orderBy(Order.property<{ title: string }>('title', 'asc'))
          .aggregate({ tag: Aggregate.group('done'), count: Aggregate.count() })
          .from(scope),
      );
      // Without an `items` aggregate each group ships one row, standing for its members.
      expect(rows.map((row) => [names(fixture, [row.objectId])[0], row.groupKey, row.groupCount])).toEqual([
        ['t1', '{"tag":null}', 2],
        ['t4', '{"tag":true}', 1],
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('collapses a count by type and hour to one row per group, carrying its aggregates', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const { rows } = yield* run(
        fixture,
        Query.select(Filter.everything())
          .aggregate({ type: Aggregate.type(), hour: Aggregate.updated('hour'), count: Aggregate.count() })
          .from(scope),
      );
      // Every fixture object was updated at 2,000 ms, inside the first UTC hour; the deleted project
      // and the task under it are out, so the task group counts three.
      const groups = rows.map((row) => ({
        ...JSON.parse(row.groupKey ?? '{}'),
        ...JSON.parse(row.aggregates ?? '{}'),
      }));
      expect(groups).toEqual([
        { type: String(PROJECT), hour: 0, count: 1 },
        { type: String(TASK), hour: 0, count: 3 },
        { type: String(PERSON), hour: 0, count: 2 },
        { type: String(HAS_MANAGER), hour: 0, count: 1 },
      ]);
      // One row per group, standing for the group's first member; the executor replaces the id with
      // the key before the row leaves the host.
      expect(rows.map((row) => [names(fixture, [row.objectId])[0], row.groupCount])).toEqual([
        ['project', 1],
        ['t1', 3],
        ['alice', 2],
        ['rel', 1],
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('sums a property and buckets a time property by floored hour', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const { rows } = yield* run(
        fixture,
        Query.select(Filter.type(TASK))
          .aggregate({ hour: Aggregate.time('due', 'hour'), priority: Aggregate.sum('priority'), n: Aggregate.count() })
          .from(scope),
      );
      // t2 sits under the deleted project; a due before 1970 floors to the hour before; a string due has no hour.
      const groups = rows
        .map((row) => ({ ...JSON.parse(row.groupKey ?? '{}'), ...JSON.parse(row.aggregates ?? '{}') }))
        .sort((a, b) => (a.hour ?? Infinity) - (b.hour ?? Infinity));
      expect(groups).toEqual([
        { hour: -3_600_000, priority: 2, n: 1 },
        { hour: 3_600_000, priority: 3, n: 1 },
        { hour: null, priority: 0, n: 1 },
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it('declines change queries but compiles sums and time buckets', () => {
    const scope = [{ _tag: 'space' as const, spaceId: SpaceId.random() }];
    const plan = (query: Query.Any) => new QueryPlanner().createPlan(query.from(scope).ast);
    expect(
      planDeclinedByCompiler(
        plan(Query.select(Filter.changes()).aggregate({ day: Aggregate.time('time', 'day'), n: Aggregate.count() })),
        planSubquery,
      ),
    ).toBe(true);
    expect(
      planDeclinedByCompiler(
        plan(
          Query.select(Filter.type(TASK)).aggregate({
            day: Aggregate.time('due', 'day'),
            total: Aggregate.sum('estimate'),
          }),
        ),
        planSubquery,
      ),
    ).toBe(false);
    expect(
      planDeclinedByCompiler(plan(Query.select(Filter.type(TASK)).aggregate({ n: Aggregate.count() })), planSubquery),
    ).toBe(false);
  });

  // Result field names come from the query author, so one that is not an identifier must still
  // compile: it used to throw here while the in-memory executor accepted it.
  it.effect('compiles an aggregate whose name is not an identifier', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const { rows } = yield* run(
        fixture,
        Query.select(Filter.type(TASK))
          .aggregate({ 'last-at': Aggregate.max('created') })
          .from([{ _tag: 'space' as const, spaceId: fixture.spaceId }]),
      );
      expect(rows).toHaveLength(1);
      expect(JSON.parse(rows[0].aggregates ?? '{}')).toHaveProperty('last-at');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('ships a body only for feed rows', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const { rows } = yield* run(
        fixture,
        Query.select(Filter.type(PERSON)).from([{ _tag: 'space' as const, spaceId: fixture.spaceId }]),
      );
      expect(rows.every((row) => row.documentJson === null)).toBe(true);
      expect(rows.every((row) => row.documentId.startsWith('doc-'))).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );
});
