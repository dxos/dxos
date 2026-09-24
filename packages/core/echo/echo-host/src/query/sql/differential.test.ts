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
import { ATTR_DELETED, ATTR_TYPE, type ObjectJSON } from '@dxos/echo/internal';
import { EntityMetaIndex, type IndexerObject, ObjectSnapshotIndex } from '@dxos/index-core';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { filterMatchObjectJSON } from '../../filter/index.ts';
import { QueryPlanner } from '../query-planner.ts';
import { compilePlan } from './compile.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));

/** Subquery planner the compiler takes by injection; see `PlanSubquery`. */
const planSubquery = (query: QueryAST.Query) => new QueryPlanner().createPlan(query);

const TYPE = DXN.make('com.example.type.item', '0.1.0');

/** Deterministic generator, so a failing case reproduces from its seed. */
const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T>(items: readonly T[]): T => items[int(items.length)];
  return { next, int, pick };
};

type Random = ReturnType<typeof makeRandom>;

const WORDS = ['alpha', 'beta', 'gamma', 'delta', '', 'Alpha', '10', 'zeta'];
const NUMBERS = [0, 1, 2, 3, 10, -1, 2.5];
const TAGS = ['a', 'b', 'c'];

/** A body drawing every field from a small domain, so predicates hit often and miss often. */
const makeBody = (random: Random, id: EntityId): ObjectJSON => {
  const body: Record<string, unknown> = { id, [ATTR_TYPE]: TYPE, [ATTR_DELETED]: false };
  if (random.next() < 0.85) {
    body.name = random.pick(WORDS);
  }
  if (random.next() < 0.85) {
    body.count = random.pick(NUMBERS);
  }
  if (random.next() < 0.7) {
    body.flag = random.next() < 0.5;
  }
  if (random.next() < 0.6) {
    body.tags = Array.from({ length: random.int(4) }, () => random.pick(TAGS));
  }
  if (random.next() < 0.5) {
    body.nested = { level: random.pick(NUMBERS), label: random.pick(WORDS) };
  }
  if (random.next() < 0.3) {
    body.mixed = random.next() < 0.5 ? random.pick(WORDS) : random.pick(NUMBERS);
  }
  return body as ObjectJSON;
};

/**
 * Ordering comparisons get an operand of the property's own type: across types the matcher
 * coerces (`2 >= ''` is true in JS) where the compiler deliberately matches nothing, and that
 * documented divergence is not what this test checks. Equality stays strict on both sides.
 */
const scalarFilter = (random: Random, property: string): QueryAST.Filter => {
  const numeric = property === 'count' || property === 'level';
  const operand = numeric && random.next() < 0.7 ? random.pick(NUMBERS) : random.pick(WORDS);
  const sameType = numeric ? random.pick(NUMBERS) : random.pick(WORDS);
  switch (random.int(6)) {
    case 0:
      return { type: 'compare', operator: 'eq', value: operand };
    case 1:
      return { type: 'compare', operator: 'neq', value: operand };
    case 2:
      return property === 'mixed'
        ? { type: 'compare', operator: 'eq', value: operand }
        : { type: 'compare', operator: random.pick(['gt', 'gte', 'lt', 'lte'] as const), value: sameType };
    case 3:
      return {
        type: 'in',
        values: Array.from({ length: random.int(3) + 1 }, () => (numeric ? random.pick(NUMBERS) : random.pick(WORDS))),
      };
    case 4:
      return numeric
        ? { type: 'range', from: random.pick(NUMBERS), to: random.pick(NUMBERS) }
        : { type: 'compare', operator: 'eq', value: undefined };
    default:
      return { type: 'not', filter: { type: 'compare', operator: 'eq', value: operand } };
  }
};

/** A random `object` filter over the generated properties, one to three predicates deep. */
const makeFilter = (random: Random, depth = 0): QueryAST.Filter => {
  const props: Record<string, QueryAST.Filter> = {};
  const count = random.int(3) + 1;
  for (let index = 0; index < count; index++) {
    switch (random.int(6)) {
      case 0:
        props.name = scalarFilter(random, 'name');
        break;
      case 1:
        props.count = scalarFilter(random, 'count');
        break;
      case 2:
        props.flag = { type: 'compare', operator: 'eq', value: random.next() < 0.5 };
        break;
      case 3:
        props.tags = { type: 'contains', value: random.pick(TAGS) };
        break;
      case 4:
        props.nested = { type: 'object', typename: null, props: { level: scalarFilter(random, 'level') } };
        break;
      default:
        props.mixed = scalarFilter(random, 'mixed');
        break;
    }
  }
  const object: QueryAST.Filter = { type: 'object', typename: TYPE, props };
  // The planner accepts `or` only over bare type filters, so alternatives are exercised as a union
  // of two selects below; a conjunction of two object filters plans as one filter step.
  if (depth === 0 && random.next() < 0.2) {
    return { type: 'and', filters: [object, makeFilter(random, depth + 1)] };
  }
  return object;
};

describe('SqlPlanCompiler differential', () => {
  it.effect('agrees with the in-memory matcher on random filters over random bodies', () =>
    Effect.gen(function* () {
      const random = makeRandom(20260917);
      const sqlClient = yield* SqlClient.SqlClient;
      const meta = new EntityMetaIndex(sqlClient);
      const bodies = new ObjectSnapshotIndex(sqlClient);
      yield* meta.migrate();
      yield* bodies.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = Array.from({ length: 150 }, () => {
        const id = EntityId.random();
        return {
          spaceId,
          documentId: `doc-${id}`,
          queueId: null,
          queueNamespace: null,
          queuePosition: null,
          recordId: null,
          createdAt: 1,
          updatedAt: 2,
          data: makeBody(random, id),
        };
      });
      yield* meta.update(objects);
      yield* meta.lookupRecordIds(objects);
      yield* bodies.update(objects);

      const scope = [{ _tag: 'space' as const, spaceId }];
      let nonEmpty = 0;
      for (let round = 0; round < 200; round++) {
        const filters = Array.from({ length: random.next() < 0.25 ? 2 : 1 }, () => makeFilter(random));
        const query =
          filters.length === 1
            ? Query.select(Filter.fromAst(filters[0])).from(scope)
            : Query.all(...filters.map((filter) => Query.select(Filter.fromAst(filter)))).from(scope);
        const plan = new QueryPlanner().createPlan(query.ast);
        const compiled = compilePlan(sqlClient, plan, planSubquery);
        const rows = yield* compiled.statement;
        const expected = objects
          .filter((object) => filters.some((filter) => filterMatchObjectJSON(filter, object.data)))
          .map((object) => object.data.id);
        const actual = rows.map((row) => row.objectId);
        expect(actual.sort(), `round ${round}: ${JSON.stringify(filters)}\n${compiled.sql}`).toEqual(
          [...expected].sort(),
        );
        if (expected.length > 0) {
          nonEmpty++;
        }
      }
      // The generator must exercise matches, not only mismatches.
      expect(nonEmpty).toBeGreaterThan(50);
    }).pipe(Effect.provide(TestLayer)),
  );
});
