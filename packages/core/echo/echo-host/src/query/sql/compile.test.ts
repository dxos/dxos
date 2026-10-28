//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as SqlClient from 'effect/sql/SqlClient';

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
    heads: [`heads-${id}`],
  });
  const objects: IndexerObject[] = [
    doc(ids.project, PROJECT, { name: 'live' }),
    doc(ids.deletedProject, PROJECT, { name: 'gone' }, { [ATTR_DELETED]: true }),
    doc(
      ids.t1,
      TASK,
      {
        title: 'alpha',
        priority: 2,
        due: -1,
        tags: ['a', 'b'],
        assignee: ref(ids.alice),
        [ATTR_META]: { annotations: { 'test.rank': 2, 'odd"key': { 'meters': 20, 'm"x': 5 } } },
      },
      { [ATTR_PARENT]: EID.make({ entityId: ids.project }) },
    ),
    doc(
      ids.t2,
      TASK,
      { title: 'beta', priority: 1, tags: ['b'], assignee: ref(ids.bob) },
      { [ATTR_PARENT]: EID.make({ entityId: ids.deletedProject }) },
    ),
    doc(ids.t3, TASK, {
      title: 'gamma',
      priority: 3,
      due: 3_600_001,
      tags: [],
      assignee: ref(ids.alice),
      [ATTR_META]: { annotations: { 'test.rank': { nested: true }, 'odd"key': { 'meters': 10, 'm"x': 1 } } },
    }),
    doc(ids.t4, TASK, {
      title: 'delta',
      due: 'soon',
      tags: ['a'],
      done: true,
      [ATTR_META]: { keys: [{ source: 'github.com', id: '42' }], annotations: { 'test.rank': 1, 'odd"key': 'text' } },
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

const TAG = DXN.make('org.dxos.type.tag', '0.1.0');

/** Tasks carrying tags: as a reference, as a legacy bare URI, and naming a tag the space does not hold. */
const seedTags = Effect.gen(function* () {
  const sqlClient = yield* SqlClient.SqlClient;
  const meta = new EntityMetaIndex(sqlClient);
  const bodies = new ObjectSnapshotIndex(sqlClient);
  yield* meta.migrate();
  yield* bodies.migrate();
  yield* new ReverseRefIndex(sqlClient).migrate();

  const spaceId = SpaceId.random();
  const ids = Object.fromEntries(
    ['tag', 'byRef', 'byLegacyUri', 'missingTag', 'untagged'].map((name) => [name, EntityId.random()]),
  ) as Fixture['ids'];
  const doc = (id: EntityId, type: URI.URI, tags?: unknown[]): IndexerObject => {
    const meta: Record<string, unknown> = tags ? { [ATTR_META]: { keys: [], tags } } : {};
    return {
      spaceId,
      documentId: `doc-${id}`,
      queueId: null,
      queueNamespace: null,
      queuePosition: null,
      recordId: null,
      createdAt: 1000,
      updatedAt: 2000,
      data: { id, [ATTR_TYPE]: type, [ATTR_DELETED]: false, ...meta },
      heads: [`heads-${id}`],
    };
  };
  const objects = [
    doc(ids.tag, TAG),
    doc(ids.byRef, TASK, [{ '/': EID.make({ entityId: ids.tag }) }]),
    doc(ids.byLegacyUri, TASK, [EID.make({ entityId: ids.tag })]),
    doc(ids.missingTag, TASK, [{ '/': EID.make({ entityId: EntityId.random() }) }]),
    doc(ids.untagged, TASK),
  ];
  yield* meta.update(objects);
  yield* meta.lookupRecordIds(objects);
  yield* bodies.update(objects);
  return { spaceId, ids } satisfies Fixture;
});

/**
 * Dependency chains for the deletion and strong-dependency walks: rows that share a parent, chains
 * past the depth bound, relation endpoints, and dependencies that are themselves dependency-broken.
 */
const seedChains = Effect.gen(function* () {
  const sqlClient = yield* SqlClient.SqlClient;
  const meta = new EntityMetaIndex(sqlClient);
  const bodies = new ObjectSnapshotIndex(sqlClient);
  yield* meta.migrate();
  yield* bodies.migrate();
  yield* new ReverseRefIndex(sqlClient).migrate();

  const spaceId = SpaceId.random();
  const chainLength = 12;
  const names = [
    'root',
    'mid',
    'leafA',
    'leafB',
    'relToLeaf',
    'orphan',
    'orphanChild',
    'relToOrphanChild',
    'brokenTag',
    'taggedBroken',
    'liveTag',
    'taggedLive',
    ...Array.from({ length: chainLength }, (_, index) => `c${index}`),
  ];
  const ids = Object.fromEntries(names.map((name) => [name, EntityId.random()])) as Fixture['ids'];
  const at = (id: EntityId) => EID.make({ entityId: id });
  const doc = (id: EntityId, type: URI.URI, extra: Record<string, unknown> = {}): IndexerObject => ({
    spaceId,
    documentId: `doc-${id}`,
    queueId: null,
    queueNamespace: null,
    queuePosition: null,
    recordId: null,
    createdAt: 1000,
    updatedAt: 2000,
    data: { id, [ATTR_TYPE]: type, [ATTR_DELETED]: false, ...extra },
    heads: [`heads-${id}`],
  });
  const tags = (tag: EntityId) => ({ [ATTR_META]: { keys: [], tags: [{ '/': at(tag) }] } });
  const objects = [
    doc(ids.root, PROJECT, { [ATTR_DELETED]: true }),
    doc(ids.mid, PROJECT, { [ATTR_PARENT]: at(ids.root) }),
    doc(ids.leafA, TASK, { [ATTR_PARENT]: at(ids.mid) }),
    doc(ids.leafB, TASK, { [ATTR_PARENT]: at(ids.mid) }),
    doc(ids.relToLeaf, HAS_MANAGER, { [ATTR_RELATION_SOURCE]: at(ids.leafA), [ATTR_RELATION_TARGET]: at(ids.c11) }),
    doc(ids.orphan, PROJECT, { [ATTR_PARENT]: at(EntityId.random()) }),
    doc(ids.orphanChild, TASK, { [ATTR_PARENT]: at(ids.orphan) }),
    doc(ids.relToOrphanChild, HAS_MANAGER, {
      [ATTR_RELATION_SOURCE]: at(ids.c11),
      [ATTR_RELATION_TARGET]: at(ids.orphanChild),
    }),
    doc(ids.brokenTag, TAG, { [ATTR_PARENT]: at(ids.orphan) }),
    doc(ids.taggedBroken, TASK, tags(ids.brokenTag)),
    doc(ids.liveTag, TAG),
    doc(ids.taggedLive, TASK, tags(ids.liveTag)),
    ...Array.from({ length: chainLength }, (_, index) =>
      doc(
        ids[`c${index}`],
        PROJECT,
        index === 0 ? { [ATTR_DELETED]: true } : { [ATTR_PARENT]: at(ids[`c${index - 1}`]) },
      ),
    ),
  ];
  yield* meta.update(objects);
  yield* meta.lookupRecordIds(objects);
  yield* bodies.update(objects);
  return { spaceId, ids } satisfies Fixture;
});

describe('SqlPlanCompiler', () => {
  it.effect('cascades deletion and withholds broken dependencies along chains, to the executor depth', () =>
    Effect.gen(function* () {
      const fixture = yield* seedChains;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const live = yield* run(fixture, Query.select(Filter.everything()).from(scope));
      // c1..c10 reach the deleted c0 within ten hops; c11 does not. `mid` and both leaves descend
      // from the deleted root, and `relToLeaf` from a cascade-deleted endpoint. `orphan` has a
      // missing parent, which withholds its child, the relation to that child, and the tag (and the
      // object tagged with it) parented under it.
      expect(
        names(
          fixture,
          live.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['c11', 'liveTag', 'taggedLive'].sort());

      const deleted = yield* run(fixture, Query.select(Filter.everything()).from(scope).options({ deleted: 'only' }));
      expect(
        names(
          fixture,
          deleted.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(
        ['root', 'mid', 'leafA', 'leafB', 'relToLeaf', ...Array.from({ length: 11 }, (_, index) => `c${index}`)].sort(),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('tags are strong dependencies, stored as references or legacy bare URIs', () =>
    Effect.gen(function* () {
      const fixture = yield* seedTags;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      const tasks = yield* run(fixture, Query.select(Filter.type(TASK)).from(scope));
      // A task naming a tag the space does not hold is withheld; a legacy bare URI does not break the query.
      expect(
        names(
          fixture,
          tasks.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['byLegacyUri', 'byRef', 'untagged']);

      const tagged = yield* run(fixture, Query.select(Filter.tag(EID.make({ entityId: fixture.ids.tag }))).from(scope));
      expect(
        names(
          fixture,
          tagged.rows.map((row) => row.objectId),
        ).sort(),
      ).toEqual(['byLegacyUri', 'byRef']);
    }).pipe(Effect.provide(TestLayer)),
  );

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

  it.effect('orders by an annotation value with non-scalars and missing values last', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
      // Built as AST: these keys hold `"`, which a JSON path cannot address and `Annotation.make` would not mint.
      const orderedBy = (order: QueryAST.Order, window: { skip?: number; limit?: number } = {}) =>
        Effect.gen(function* () {
          const query = Query.fromAst({
            type: 'order',
            query: Query.select(Filter.type(TASK)).from(scope).ast,
            order: [order],
          });
          const skipped = window.skip === undefined ? query : query.skip(window.skip);
          const { rows } = yield* run(fixture, window.limit === undefined ? skipped : skipped.limit(window.limit));
          return names(
            fixture,
            rows.map((row) => row.objectId),
          );
        });

      expect(yield* orderedBy({ kind: 'annotation', key: 'test.rank', direction: 'asc' })).toEqual(['t4', 't1', 't3']);
      expect(yield* orderedBy({ kind: 'annotation', key: 'test.rank', direction: 'desc' })).toEqual(['t1', 't4', 't3']);
      // A path into a text-valued annotation reads as null rather than failing the statement.
      expect(yield* orderedBy({ kind: 'annotation', key: 'odd"key', path: ['meters'], direction: 'asc' })).toEqual([
        't3',
        't1',
        't4',
      ]);
      expect(yield* orderedBy({ kind: 'annotation', key: 'odd"key', path: ['m"x'], direction: 'desc' })).toEqual([
        't1',
        't3',
        't4',
      ]);
      expect(
        yield* orderedBy(
          { kind: 'annotation', key: 'odd"key', path: ['meters'], direction: 'asc' },
          { skip: 1, limit: 1 },
        ),
      ).toEqual(['t1']);
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

  it.effect('pages a feed in natural order inside the scan', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const sqlClient = yield* SqlClient.SqlClient;
      const queueId = EntityId.random();
      const ids = Array.from({ length: 6 }, () => EntityId.random()).sort();
      const objects = ids.map((id): IndexerObject => ({
        spaceId: fixture.spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        queuePosition: null,
        createdAt: 1000,
        updatedAt: 2000,
        data: { id, [ATTR_TYPE]: TASK, [ATTR_DELETED]: false },
      }));
      const meta = new EntityMetaIndex(sqlClient);
      yield* meta.update(objects);
      yield* meta.lookupRecordIds(objects);
      yield* new ObjectSnapshotIndex(sqlClient).update(objects);

      const { rows } = yield* run(
        fixture,
        Query.select(Filter.everything())
          .orderBy(Order.natural('desc'))
          .skip(2)
          .limit(3)
          .from([{ _tag: 'feed' as const, feedUri: EID.make({ spaceId: fixture.spaceId, entityId: queueId }) }]),
      );
      expect(rows.map((row) => row.objectId)).toEqual([ids[3], ids[2], ids[1]]);
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

  it.effect('ships each document row its heads', () =>
    Effect.gen(function* () {
      const fixture = yield* seed;
      const query = Query.select(Filter.type(PERSON)).from([{ _tag: 'space' as const, spaceId: fixture.spaceId }]);

      const { rows } = yield* run(fixture, query);
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(JSON.parse(row.heads ?? 'null')).toEqual([`heads-${row.objectId}`]);
      }
    }).pipe(Effect.provide(TestLayer)),
  );
});
