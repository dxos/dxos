//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Filter, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EntityMetaIndex, ObjectSnapshotIndex, ReverseRefIndex } from '@dxos/index-core';
import { SpaceId } from '@dxos/keys';

import { QueryPlanner } from '../query-planner.ts';
import { compilePlan } from './compile.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));

/** Subquery planner the compiler takes by injection; see `PlanSubquery`. */
const planSubquery = (query: QueryAST.Query) => new QueryPlanner().createPlan(query);

/** `EXPLAIN QUERY PLAN` rows of a compiled query, against the real index migrations. */
const explain = (query: Query.Any) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* new EntityMetaIndex(sql).migrate();
    yield* new ObjectSnapshotIndex(sql).migrate();
    yield* new ReverseRefIndex(sql).migrate();
    const plan = new QueryPlanner().createPlan(query.ast);
    const compiled = compilePlan(sql, plan, planSubquery);
    const rows = yield* sql.unsafe<{ detail: string }>(
      `EXPLAIN QUERY PLAN ${compiled.sql}`,
      compiled.statement.compile()[1],
    );
    return rows.map((row) => row.detail);
  });

const scope = [{ _tag: 'space' as const, spaceId: SpaceId.random() }];

// Without `ANALYZE` statistics SQLite prefers an equality on `queueId` (the leading column of the
// queue-position index, true of every document row) over the `(spaceId, objectId)` seek; the
// compiler pins the seek. A plan that touches the queue-position index here is a full scan of the
// space's documents per row, the 17x regression the first benchmark run measured.
describe('compiled plans seek the index', () => {
  it.effect('outgoing reference traversal joins its targets by (space, queue, object)', () =>
    Effect.gen(function* () {
      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(scope));
      const plan = details.join('\n');
      expect(plan).not.toContain('idx_object_index_queuePosition');
      expect(plan).toMatch(
        /SEARCH t USING (COVERING )?INDEX idx_object_index_queueObjectId \(spaceId=\? AND queueId=\? AND objectId=\?\)/,
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('the deletion and dependency recursions seek their parents', () =>
    Effect.gen(function* () {
      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).from(scope));
      expect(details.some((detail) => detail.includes('idx_object_index_queuePosition'))).toBe(false);
      expect(details.filter((detail) => detail.includes('SEARCH p USING'))).not.toHaveLength(0);
      expect(
        details.filter((detail) => detail.includes('SEARCH p USING')).every((detail) => detail.includes('objectId=?')),
      ).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a type select seeks the type index', () =>
    Effect.gen(function* () {
      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).from(scope));
      expect(details.join('\n')).toContain('idx_object_index_typeDXN (spaceId=? AND typeDXN');
    }).pipe(Effect.provide(TestLayer)),
  );
});
