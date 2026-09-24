//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import * as Statement from 'effect/unstable/sql/Statement';

import { ATTR_DELETED, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { TestSqliteLayer as TestLayer } from '../testing/index.ts';
import { SqlBoundVariableLimit } from '../utils.ts';
import { EntityMetaIndex, type QueueRef, type QueueWindow } from './entity-meta-index.ts';
import { FtsIndex } from './fts-index.ts';
import type { IndexerObject } from './interface.ts';

// These reads combine lists under OR, NOT and a LIMIT, so each is checked to return the same rows in
// the same order when split across statements as when run as one.

/** Small enough that every read below is split across several statements. */
const CHUNKED_LIMIT = 10;

/** Large enough that every read below is one statement, which node SQLite accepts. */
const UNCHUNKED_LIMIT = 1_000_000;

const SPACE_COUNT = 20;
const TYPE_COUNT = 16;

const storedType = (index: number) => DXN.make(`com.example.type.t${index % TYPE_COUNT}`, '0.1.0');

/** A type filter mixing versioned identifiers (one variable each) and versionless ones (two). */
const typeFilter = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    index % 2 === 0 ? DXN.make(`com.example.type.t${index}`, '0.1.0') : DXN.make(`com.example.type.t${index}`),
  );

type Fixture = { meta: EntityMetaIndex; fts: FtsIndex; spaceIds: SpaceId[]; queues: QueueRef[] };

/**
 * Documents and queues in many spaces. The first item of every queue shares one object id, and both
 * queues of a space share its first position, so every ordering needs its `recordId` tiebreaker.
 */
const seed = Effect.fnUntraced(function* () {
  const meta = new EntityMetaIndex(yield* SqlClient.SqlClient);
  const fts = new FtsIndex(yield* SqlClient.SqlClient);
  yield* meta.migrate();
  yield* fts.migrate();

  const spaceIds = Array.from({ length: SPACE_COUNT }, () => SpaceId.random());
  const queues: QueueRef[] = [];
  const objects: IndexerObject[] = [];
  const sharedObjectId = EntityId.random();
  let position = 0;
  spaceIds.forEach((spaceId, spaceIndex) => {
    for (let index = 0; index < 3; index++) {
      objects.push({
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: `doc-${spaceIndex}-${index}`,
        recordId: null,
        createdAt: 1_000 + index,
        updatedAt: 2_000 + spaceIndex,
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: storedType(spaceIndex + index),
          [ATTR_DELETED]: index === 2,
          title: index === 1 ? 'meeting notes alpha' : 'alpha',
        },
      });
    }

    const firstPosition = ++position;
    for (let queueIndex = 0; queueIndex < 2; queueIndex++) {
      const queueId = EntityId.random();
      queues.push({ spaceId, queueId });
      for (let itemIndex = 0; itemIndex < 2; itemIndex++) {
        objects.push({
          spaceId,
          queueId,
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          createdAt: null,
          updatedAt: 3_000 + spaceIndex,
          queuePosition: itemIndex === 0 ? firstPosition : ++position,
          data: {
            id: itemIndex === 0 ? sharedObjectId : EntityId.random(),
            [ATTR_TYPE]: storedType(spaceIndex + queueIndex + itemIndex),
            [ATTR_DELETED]: queueIndex === 1 && itemIndex === 1,
            title: 'alpha',
          },
        });
      }
    }
  });

  yield* meta.update(objects);
  yield* meta.lookupRecordIds(objects);
  yield* fts.update(objects);
  const fixture: Fixture = { meta, fts, spaceIds, queues };
  return fixture;
});

/**
 * Runs a read under a bound-variable limit, refusing any statement over it as Durable Object SQLite
 * would, and counts the statements it issues.
 */
const runWithLimit = <A, E, R>(read: Effect.Effect<A, E, R>, limit: number) =>
  Effect.gen(function* () {
    let statements = 0;
    const result = yield* read.pipe(
      Effect.provideService(SqlBoundVariableLimit, limit),
      Effect.provideService(Statement.CurrentTransformer, (statement) => {
        statements++;
        const [query, params] = statement.compile();
        return params.length > limit
          ? Effect.die(new Error(`statement binds ${params.length} variables, over ${limit}: ${query}`))
          : Effect.succeed(statement);
      }),
    );
    return { result, statements };
  });

/** The read's rows split across statements and in one, and how many statements the split took. */
const runBothWays = <T extends { readonly recordId: number }, E, R>(read: Effect.Effect<readonly T[], E, R>) =>
  Effect.gen(function* () {
    const unchunked = yield* runWithLimit(read, UNCHUNKED_LIMIT);
    const chunked = yield* runWithLimit(read, CHUNKED_LIMIT);
    expect(unchunked.statements).toBe(1);
    return { unchunked: unchunked.result, chunked: chunked.result, statements: chunked.statements };
  });

/** An unordered read promises its rows, not their order. */
const byRecordId = <T extends { readonly recordId: number }>(rows: readonly T[]): T[] =>
  [...rows].sort((left, right) => left.recordId - right.recordId);

const WINDOWS: (QueueWindow | undefined)[] = [
  undefined,
  { kind: 'natural', direction: 'asc', limit: 5, deleted: false },
  { kind: 'natural', direction: 'desc', limit: 7 },
  { kind: 'cursor', after: 2, limit: 6 },
  { kind: 'cursor', after: 0, before: 30 },
];

/**
 * Asserts the chunked rows equal the unchunked ones, in order whenever the read is ordered, and
 * returns how many there were: a narrow window can match nothing, but a whole test must not.
 */
const expectSameRows = <T extends { readonly recordId: number }>(
  { chunked, unchunked }: { chunked: readonly T[]; unchunked: readonly T[] },
  ordered: boolean,
): number => {
  expect(ordered ? chunked : byRecordId(chunked)).toEqual(ordered ? unchunked : byRecordId(unchunked));
  return unchunked.length;
};

describe('chunked reads', () => {
  it.effect(
    'the test layer refuses a statement wider than Durable Object SQLite accepts',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const values = Array.from({ length: 101 }, (_, index) => index);
      const exit = yield* Effect.exit(sql`SELECT 1 WHERE 1 IN ${sql.in(values)}`);
      expect(exit._tag).toBe('Failure');
      expect(String(exit)).toContain('statement binds 101 variables');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'queryAll returns across chunked sources what it returns from one statement',
    Effect.fnUntraced(function* () {
      const { meta, spaceIds } = yield* seed();
      let compared = 0;
      // Straddles every chunk boundary of a limit of 10, less the window's own variables.
      for (const spaceCount of [1, 6, 7, 8, 9, 10, 11, 16, SPACE_COUNT]) {
        for (const window of WINDOWS) {
          const rows = yield* runBothWays(
            meta.queryAll({ spaceIds: spaceIds.slice(0, spaceCount), includeAllQueues: true, window }),
          );
          compared += expectSameRows(rows, window !== undefined);
        }
      }
      expect(compared).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'queryAll counts a row matched by both its space and its queue once',
    Effect.fnUntraced(function* () {
      const { meta, spaceIds, queues } = yield* seed();
      for (const window of WINDOWS) {
        const rows = yield* runBothWays(meta.queryAll({ spaceIds, includeAllQueues: true, queues, window }));
        expect(expectSameRows(rows, window !== undefined)).toBeGreaterThan(0);
        expect(rows.statements).toBeGreaterThan(1);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'queryTypes returns across chunked type and source lists what it returns from one statement',
    Effect.fnUntraced(function* () {
      const { meta, spaceIds, queues } = yield* seed();
      let compared = 0;
      for (const typeCount of [1, 3, 5, 6, 7, 12, TYPE_COUNT]) {
        for (const window of WINDOWS) {
          const rows = yield* runBothWays(
            meta.queryTypes({
              spaceIds,
              typeDxns: typeFilter(typeCount),
              includeAllQueues: true,
              queues: queues.slice(0, 5),
              window,
            }),
          );
          compared += expectSameRows(rows, window !== undefined);
        }
      }
      expect(compared).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'an inverted type filter excludes the same rows whether or not it fits in one statement',
    Effect.fnUntraced(function* () {
      const { meta, spaceIds } = yield* seed();
      let compared = 0;
      // Two types negate within every statement; sixteen need the rows they match found first.
      for (const typeCount of [0, 2, TYPE_COUNT]) {
        for (const window of WINDOWS) {
          const rows = yield* runBothWays(
            meta.queryTypes({
              spaceIds,
              typeDxns: typeFilter(typeCount),
              inverted: true,
              includeAllQueues: true,
              window,
            }),
          );
          compared += expectSameRows(rows, window !== undefined);
        }
      }
      expect(compared).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'queryByTimeRange returns across chunked sources what it returns from one statement',
    Effect.fnUntraced(function* () {
      const { meta, spaceIds, queues } = yield* seed();
      const rows = yield* runBothWays(
        meta.queryByTimeRange({ spaceIds, updatedAfter: 2_005, updatedBefore: 3_010, includeAllQueues: false, queues }),
      );
      expect(expectSameRows(rows, false)).toBeGreaterThan(0);
      expect(rows.statements).toBeGreaterThan(1);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'full-text search ranks across chunked lists as it does in one statement',
    Effect.fnUntraced(function* () {
      const { fts, spaceIds, queues } = yield* seed();
      // `alpha` ranks by bm25 and ties across identical titles; `al` falls back to LIKE, all rank 1.
      for (const query of ['alpha', 'al']) {
        for (const typeDxns of [undefined, typeFilter(TYPE_COUNT)]) {
          // A space with all its queues and one of those queues match the same rows.
          const rows = yield* runBothWays(
            fts.query({
              query,
              spaceId: spaceIds.slice(0, 3),
              includeAllQueues: true,
              queues: queues.slice(0, 6),
              typeDxns,
            }),
          );
          expect(expectSameRows(rows, true)).toBeGreaterThan(0);
          expect(rows.statements).toBeGreaterThan(1);
        }
      }
    }, Effect.provide(TestLayer)),
  );
});
