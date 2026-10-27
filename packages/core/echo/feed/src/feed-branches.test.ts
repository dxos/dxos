//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as SqlClient from 'effect/sql/SqlClient';
import * as TestClock from 'effect/testing/TestClock';

import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { FeedStore, type LocalAppendMessage, type WalkRequest } from './feed-store.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

const namespace = FeedProtocol.WellKnownNamespaces.data;

const blockId = (block: FeedProtocol.Block) => FeedProtocol.formatBlockId(block.actorId, block.sequence);

const prevOf = (block: FeedProtocol.Block) =>
  block.prevActorId === null || block.prevSequence === null
    ? null
    : FeedProtocol.formatBlockId(block.prevActorId, block.prevSequence);

const setup = Effect.gen(function* () {
  const spaceId = SpaceId.random();
  const feedId = EntityId.random();
  const store = new FeedStore({ localActorId: 'alice', assignPositions: true });
  yield* store.migrate();
  const append = (options: Omit<LocalAppendMessage, 'spaceId' | 'feedId' | 'feedNamespace' | 'data'> = {}) =>
    store
      .appendLocal([{ spaceId, feedId, feedNamespace: namespace, data: new Uint8Array([1]), ...options }])
      .pipe(Effect.map(([block]) => block));
  const read = store
    .query({ requestId: 'read', spaceId, feedNamespace: namespace, query: { feedIds: [feedId] }, position: -1 })
    .pipe(Effect.map(({ blocks }) => blocks));
  return { spaceId, feedId, store, append, read };
});

describe('FeedStore branches', () => {
  it.effect('a continuation follows the head of its branch, and a fork follows its fork point', () =>
    Effect.gen(function* () {
      const { append, read } = yield* setup;
      const a1 = yield* append();
      const a2 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const branch = blockId(b1);
      const b2 = yield* append({ branch });
      const a3 = yield* append();

      expect(prevOf(a1)).toBeNull();
      expect(prevOf(a2)).toEqual(blockId(a1));
      expect(b1.fork).toBe(true);
      expect(prevOf(b1)).toEqual(blockId(a1));
      expect(prevOf(b2)).toEqual(branch);
      expect(prevOf(a3)).toEqual(blockId(a2));

      const blocks = yield* read;
      expect(blocks.map((block) => [blockId(block), block.fork ?? false, block.branch])).toEqual([
        [blockId(a1), false, null],
        [blockId(a2), false, null],
        [branch, true, branch],
        [blockId(b2), false, branch],
        [blockId(a3), false, null],
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('keeps one row for each branch, with its base branch, its fork point and its head', () =>
    Effect.gen(function* () {
      const { append, read } = yield* setup;
      const a1 = yield* append();
      yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const b2 = yield* append({ branch: blockId(b1) });
      const c1 = yield* append({ forkAt: blockId(b2) });

      const insertionIds = new Map((yield* read).map((block) => [blockId(block), block.insertionId]));
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{
        branchId: string;
        baseBranchId: string | null;
        baseInsertionId: number;
        forkInsertionId: number | null;
        headSequence: number;
      }>`SELECT branchId, baseBranchId, baseInsertionId, forkInsertionId, headSequence FROM branches ORDER BY baseInsertionId`;
      expect(rows).toEqual([
        {
          branchId: '',
          baseBranchId: null,
          baseInsertionId: insertionIds.get(blockId(a1)),
          forkInsertionId: null,
          headSequence: 1,
        },
        {
          branchId: blockId(b1),
          baseBranchId: '',
          baseInsertionId: insertionIds.get(blockId(b1)),
          forkInsertionId: insertionIds.get(blockId(a1)),
          headSequence: b2.sequence,
        },
        {
          branchId: blockId(c1),
          baseBranchId: blockId(b1),
          baseInsertionId: insertionIds.get(blockId(c1)),
          forkInsertionId: insertionIds.get(blockId(b2)),
          headSequence: c1.sequence,
        },
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a replica infers the same branches from the fork flag and the predecessors', () =>
    Effect.gen(function* () {
      const { spaceId, append, read } = yield* setup;
      const a1 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      yield* append({ branch: blockId(b1) });
      yield* append();
      const written = yield* read;

      const replica = new FeedStore({ localActorId: 'bob', assignPositions: false });
      yield* replica.migrate();
      // The local columns stay behind: the replica infers them again.
      const blocks = written.map(({ branch: _branch, insertionId: _insertionId, ...block }) => block);
      yield* replica.append({ requestId: 'pull', spaceId, feedNamespace: namespace, blocks });
      const { blocks: replicated } = yield* replica.query({
        requestId: 'read',
        spaceId,
        feedNamespace: namespace,
        query: { feedIds: [blocks[0].feedId ?? ''] },
        position: -1,
      });
      expect(replicated.map((block) => [blockId(block), block.branch])).toEqual(
        written.map((block) => [blockId(block), block.branch]),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses a continuation of a branch the feed does not hold', () =>
    Effect.gen(function* () {
      const { append } = yield* setup;
      yield* append();
      const exit = yield* Effect.exit(append({ branch: '7@nobody' }));
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  describe('walk', () => {
    // a1 a2 b1(fork at a1) a3 b2 c1(fork at b1) b3: the root, a branch of it, and a branch of that.
    const tree = Effect.gen(function* () {
      const context = yield* setup;
      const { append } = context;
      const a1 = yield* append();
      const a2 = yield* append();
      const b1 = yield* append({ forkAt: blockId(a1) });
      const a3 = yield* append();
      const b2 = yield* append({ branch: blockId(b1) });
      const c1 = yield* append({ forkAt: blockId(b1) });
      const b3 = yield* append({ branch: blockId(b1) });
      const names = new Map(
        Object.entries({ a1, a2, b1, a3, b2, c1, b3 }).map(([name, block]) => [blockId(block), name]),
      );
      const walk = (request: Omit<WalkRequest, 'spaceId' | 'feedNamespace' | 'feedId'>) =>
        context.store
          .walk({ spaceId: context.spaceId, feedNamespace: namespace, feedId: context.feedId, ...request })
          .pipe(Effect.map((blocks) => blocks.map((block) => names.get(blockId(block)))));
      return {
        walk,
        store: context.store,
        spaceId: context.spaceId,
        feedId: context.feedId,
        branchB: blockId(b1),
        branchC: blockId(c1),
        a1: blockId(a1),
        b2: blockId(b2),
      };
    });

    it.effect('forward to the root branch gives only the root', () =>
      Effect.gen(function* () {
        const { walk } = yield* tree;
        expect(yield* walk({ direction: 'asc' })).toEqual(['a1', 'a2', 'a3']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('forward to a nested branch cuts each ancestor at the fork point of the next', () =>
      Effect.gen(function* () {
        const { walk, branchB, branchC } = yield* tree;
        expect(yield* walk({ direction: 'asc', branch: branchB })).toEqual(['a1', 'b1', 'b2', 'b3']);
        expect(yield* walk({ direction: 'asc', branch: branchC })).toEqual(['a1', 'b1', 'c1']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('with forks, a walk gives the base of each branch that forks at a walked block', () =>
      Effect.gen(function* () {
        const { walk, branchB } = yield* tree;
        expect(yield* walk({ direction: 'asc', forks: true })).toEqual(['a1', 'b1', 'a2', 'a3']);
        expect(yield* walk({ direction: 'asc', branch: branchB, forks: true })).toEqual(['a1', 'b1', 'c1', 'b2', 'b3']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a cursor resumes after its block, also after a fork base', () =>
      Effect.gen(function* () {
        const { walk, branchB, a1 } = yield* tree;
        expect(yield* walk({ direction: 'asc', branch: branchB, after: a1 })).toEqual(['b1', 'b2', 'b3']);
        expect(yield* walk({ direction: 'asc', forks: true, after: branchB })).toEqual(['a2', 'a3']);
        expect(yield* walk({ direction: 'asc', after: '9@nobody' })).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a walk hides blocks past the maxAge of the feed, as every other read does', () =>
      Effect.gen(function* () {
        const { walk, store, spaceId, feedId } = yield* tree;
        expect(yield* walk({ direction: 'asc' })).toEqual(['a1', 'a2', 'a3']);
        // Applied while no block has expired, so only the clock moving past them can hide one.
        yield* TestClock.setTime(Date.now());
        yield* store.setFeedOptions({
          spaceId,
          feedId,
          feedNamespace: namespace,
          options: { retention: { maxAge: 60_000 } },
        });
        yield* TestClock.setTime(Date.now() + 120_000);
        expect(yield* walk({ direction: 'asc' })).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('backward from a block goes to the root base through each base branch', () =>
      Effect.gen(function* () {
        const { walk, branchB, b2 } = yield* tree;
        expect(yield* walk({ direction: 'desc', after: b2 })).toEqual(['b1', 'a1']);
        expect(yield* walk({ direction: 'desc', branch: branchB })).toEqual(['b3', 'b2', 'b1', 'a1']);
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});
