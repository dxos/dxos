//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { KEY_FEED_BLOCK, KEY_FEED_BRANCH, KEY_FEED_FORK, KEY_FEED_PREV } from '@dxos/echo-protocol';

import * as Feed from './Feed.ts';
import * as Obj from './Obj.ts';
import { TestSchema } from './testing/index.ts';

describe('Feed', () => {
  describe('options', () => {
    test('RetentionOptions accepts either limit, both, or neither', ({ expect }) => {
      const decode = Schema.decodeUnknownExit(Feed.RetentionOptions);
      expect(Exit.isSuccess(decode({}))).toBe(true);
      expect(Exit.isSuccess(decode({ maxLength: 1 }))).toBe(true);
      expect(Exit.isSuccess(decode({ maxAge: 1_000 }))).toBe(true);
      expect(Exit.isSuccess(decode({ maxLength: 100, maxAge: 1_000 }))).toBe(true);
    });

    test('RetentionOptions rejects a length below 1, a fractional length, and a non-positive age', ({ expect }) => {
      const decode = Schema.decodeUnknownExit(Feed.RetentionOptions);
      expect(Exit.isFailure(decode({ maxLength: 0 }))).toBe(true);
      expect(Exit.isFailure(decode({ maxLength: 1.5 }))).toBe(true);
      expect(Exit.isFailure(decode({ maxAge: 0 }))).toBe(true);
      expect(Exit.isFailure(decode({ maxAge: -1 }))).toBe(true);
      expect(Exit.isFailure(decode({ maxAge: Number.POSITIVE_INFINITY }))).toBe(true);
    });

    test('FeedOptions round-trips through JSON', ({ expect }) => {
      const options: Feed.FeedOptions = { indexing: { enabled: false }, retention: { maxLength: 5 } };
      const codec = Schema.fromJsonString(Feed.FeedOptions);
      expect(Schema.decodeUnknownSync(codec)(Schema.encodeSync(codec)(options))).toEqual(options);
    });

    test('setRetention stores maxAge in milliseconds', ({ expect }) => {
      const feed = Feed.make({ name: 'log' });
      Effect.runSync(Feed.setRetention(feed, { maxLength: 100, maxAge: Duration.days(7) }));
      expect(feed.retention).toEqual({ maxLength: 100, maxAge: Duration.toMillis(Duration.days(7)) });
    });

    test('setRetention with an invalid value fails and leaves the object unchanged', ({ expect }) => {
      const feed = Feed.make({ name: 'log' });
      Effect.runSync(Feed.setRetention(feed, { maxLength: 10 }));
      expect(Exit.isFailure(Effect.runSyncExit(Feed.setRetention(feed, { maxLength: 0 })))).toBe(true);
      expect(Exit.isFailure(Effect.runSyncExit(Feed.setRetention(feed, { maxAge: Duration.millis(-1) })))).toBe(true);
      expect(Exit.isFailure(Effect.runSyncExit(Feed.setRetention(feed, { maxAge: Duration.infinity })))).toBe(true);
      expect(feed.retention).toEqual({ maxLength: 10 });
    });

    test('setIndexing writes the indexing field', ({ expect }) => {
      const feed = Feed.make({ name: 'log' });
      expect(feed.indexing).toBeUndefined();
      Effect.runSync(Feed.setIndexing(feed, { enabled: false }));
      expect(feed.indexing).toEqual({ enabled: false });
      expect(Obj.toJSON(feed)).toMatchObject({ indexing: { enabled: false } });
    });
  });

  describe('getParent / setParent', () => {
    test('an item has no explicit parent by default', ({ expect }) => {
      expect(Feed.getParent(Obj.make(TestSchema.Task, { title: 'm1' }))).toBeUndefined();
    });

    test('round-trips a parent set from an item', ({ expect }) => {
      const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
      const m2 = Obj.make(TestSchema.Task, { title: 'm2' });
      Feed.setParent(m2, m1);
      expect(Feed.getParent(m2)).toBe(m1.id);
    });

    test('round-trips a parent set from an id', ({ expect }) => {
      const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
      const m2 = Obj.make(TestSchema.Task, { title: 'm2' });
      Feed.setParent(m2, m1.id);
      expect(Feed.getParent(m2)).toBe(m1.id);
    });

    test('re-setting replaces rather than accumulates', ({ expect }) => {
      const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
      const m2 = Obj.make(TestSchema.Task, { title: 'm2' });
      const m3 = Obj.make(TestSchema.Task, { title: 'm3' });
      Feed.setParent(m3, m1);
      Feed.setParent(m3, m2);
      expect(Feed.getParent(m3)).toBe(m2.id);
      expect(Obj.getKeys(m3, Feed.PARENT_KEY)).toHaveLength(1);
    });

    test('undefined clears the parent', ({ expect }) => {
      const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
      const m2 = Obj.make(TestSchema.Task, { title: 'm2' });
      Feed.setParent(m2, m1);
      Feed.setParent(m2, undefined);
      expect(Feed.getParent(m2)).toBeUndefined();
    });
  });

  describe('history', () => {
    test('a feed with no lineage resolves to itself', ({ expect }) => {
      const items = [
        Obj.make(TestSchema.Task, { title: 'm1' }),
        Obj.make(TestSchema.Task, { title: 'm2' }),
        Obj.make(TestSchema.Task, { title: 'm3' }),
      ];
      const history = Feed.history(items);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3']);
      expect(history.shallow).toBe(false);
    });

    test('an empty feed resolves to nothing', ({ expect }) => {
      const history = Feed.history([]);
      expect(history.items).toEqual([]);
      expect(history.shallow).toBe(false);
    });

    // The worked example: forking from m3 abandons m4 without removing it from the log.
    test('a fork discards the items appended between the parent and the fork', ({ expect }) => {
      const [m1, m2, m3, m4, m5] = [
        Obj.make(TestSchema.Task, { title: 'm1' }),
        Obj.make(TestSchema.Task, { title: 'm2' }),
        Obj.make(TestSchema.Task, { title: 'm3' }),
        Obj.make(TestSchema.Task, { title: 'm4' }),
        Obj.make(TestSchema.Task, { title: 'm5' }),
      ];
      Feed.setParent(m5, m3);
      const history = Feed.history([m1, m2, m3, m4, m5]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm5']);
      expect(history.shallow).toBe(false);
    });

    // Latest-wins: a second fork from m4 makes m4's branch live again and hides m5.
    test('the most recently appended branch wins', ({ expect }) => {
      const [m1, m2, m3, m4, m5, m6] = [
        Obj.make(TestSchema.Task, { title: 'm1' }),
        Obj.make(TestSchema.Task, { title: 'm2' }),
        Obj.make(TestSchema.Task, { title: 'm3' }),
        Obj.make(TestSchema.Task, { title: 'm4' }),
        Obj.make(TestSchema.Task, { title: 'm5' }),
        Obj.make(TestSchema.Task, { title: 'm6' }),
      ];
      Feed.setParent(m5, m3);
      Feed.setParent(m6, m4);
      const history = Feed.history([m1, m2, m3, m4, m5, m6]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm4', 'm6']);
      expect(history.shallow).toBe(false);
    });

    test('items appended after a fork chain onto it implicitly', ({ expect }) => {
      const [m1, m2, m3, m4, m5, m6] = [
        Obj.make(TestSchema.Task, { title: 'm1' }),
        Obj.make(TestSchema.Task, { title: 'm2' }),
        Obj.make(TestSchema.Task, { title: 'm3' }),
        Obj.make(TestSchema.Task, { title: 'm4' }),
        Obj.make(TestSchema.Task, { title: 'm5' }),
        Obj.make(TestSchema.Task, { title: 'm6' }),
      ];
      Feed.setParent(m5, m3);
      const history = Feed.history([m1, m2, m3, m4, m5, m6]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm5', 'm6']);
    });

    test('consecutive forks from the same parent keep only the last', ({ expect }) => {
      const [m1, m2, m3, m4] = [
        Obj.make(TestSchema.Task, { title: 'm1' }),
        Obj.make(TestSchema.Task, { title: 'm2' }),
        Obj.make(TestSchema.Task, { title: 'm3' }),
        Obj.make(TestSchema.Task, { title: 'm4' }),
      ];
      Feed.setParent(m3, m1);
      Feed.setParent(m4, m1);
      const history = Feed.history([m1, m2, m3, m4]);
      expect(titles(history)).toEqual(['m1', 'm4']);
    });

    describe('head', () => {
      test('resolves an abandoned branch when given its leaf', ({ expect }) => {
        const [m1, m2, m3, m4, m5] = [
          Obj.make(TestSchema.Task, { title: 'm1' }),
          Obj.make(TestSchema.Task, { title: 'm2' }),
          Obj.make(TestSchema.Task, { title: 'm3' }),
          Obj.make(TestSchema.Task, { title: 'm4' }),
          Obj.make(TestSchema.Task, { title: 'm5' }),
        ];
        Feed.setParent(m5, m3);
        const history = Feed.history([m1, m2, m3, m4, m5], { head: m4 });
        expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm4']);
        expect(history.shallow).toBe(false);
      });

      test('accepts an id', ({ expect }) => {
        const [m1, m2, m3] = [
          Obj.make(TestSchema.Task, { title: 'm1' }),
          Obj.make(TestSchema.Task, { title: 'm2' }),
          Obj.make(TestSchema.Task, { title: 'm3' }),
        ];
        const history = Feed.history([m1, m2, m3], { head: m2.id });
        expect(titles(history)).toEqual(['m1', 'm2']);
      });

      test('an unknown head resolves to nothing and reports truncation', ({ expect }) => {
        const history = Feed.history([Obj.make(TestSchema.Task, { title: 'm1' })], {
          head: Obj.make(TestSchema.Task, { title: 'absent' }),
        });
        expect(history.items).toEqual([]);
        expect(history.shallow).toBe(true);
      });
    });

    describe('truncation', () => {
      // A parent may legitimately be missing under partial replication, or because the caller's
      // filter excluded it.
      test('an absent parent stops the walk', ({ expect }) => {
        const [m1, m2] = [Obj.make(TestSchema.Task, { title: 'm1' }), Obj.make(TestSchema.Task, { title: 'm2' })];
        Feed.setParent(m2, Obj.make(TestSchema.Task, { title: 'unreplicated' }));
        const history = Feed.history([m1, m2]);
        expect(titles(history)).toEqual(['m2']);
        expect(history.shallow).toBe(true);
      });

      test('a forward reference terminates the walk', ({ expect }) => {
        const [m1, m2] = [Obj.make(TestSchema.Task, { title: 'm1' }), Obj.make(TestSchema.Task, { title: 'm2' })];
        Feed.setParent(m1, m2);
        const history = Feed.history([m1, m2]);
        expect(titles(history)).toEqual(['m1', 'm2']);
        expect(history.shallow).toBe(true);
      });

      test('a self-reference terminates the walk', ({ expect }) => {
        const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
        Feed.setParent(m1, m1);
        const history = Feed.history([m1]);
        expect(titles(history)).toEqual(['m1']);
        expect(history.shallow).toBe(true);
      });

      // A malformed replicated id must not read as "no parent" — that would resolve the fork as an
      // implicit continuation and resurrect the items it abandoned.
      test('a malformed parent id truncates rather than falling through to the predecessor', ({ expect }) => {
        const [m1, m2, m3] = [
          Obj.make(TestSchema.Task, { title: 'm1' }),
          Obj.make(TestSchema.Task, { title: 'm2' }),
          Obj.make(TestSchema.Task, { title: 'm3' }),
        ];
        corruptParent(m3);
        const history = Feed.history([m1, m2, m3]);
        expect(titles(history)).toEqual(['m3']);
        expect(history.shallow).toBe(true);
      });

      test('getParent reports a malformed parent as undefined', ({ expect }) => {
        const m1 = Obj.make(TestSchema.Task, { title: 'm1' });
        corruptParent(m1);
        expect(Feed.getParent(m1)).toBeUndefined();
      });
    });
  });

  describe('branches', () => {
    type Stamp = { block: string; branch?: string; fork?: boolean; prev?: string };

    // Puts on each item the keys the store stamps on read, as if it was read from the block in its stamp.
    const read = (...stamps: [string, Stamp][]) =>
      stamps.map(([title, stamp]) =>
        Obj.make(TestSchema.Task, {
          title,
          [Obj.Meta]: {
            keys: [
              { source: KEY_FEED_BLOCK, id: stamp.block },
              ...(stamp.branch !== undefined ? [{ source: KEY_FEED_BRANCH, id: stamp.branch }] : []),
              ...(stamp.prev !== undefined ? [{ source: KEY_FEED_PREV, id: stamp.prev }] : []),
              ...(stamp.prev !== undefined && stamp.fork ? [{ source: KEY_FEED_FORK, id: stamp.prev }] : []),
            ],
          },
        }),
      );

    test('an item read from a root block has no branch and no fork flag', ({ expect }) => {
      const [a1] = read(['a1', { block: '0@a' }]);
      expect(Feed.getBranch(a1)).toBeUndefined();
      expect(Feed.isFork(a1)).toBe(false);
      expect(Feed.getBlockId(a1)).toBe('0@a');
      expect(Feed.getPredecessor(a1)).toBeUndefined();
    });

    test('a base item names its own branch, and its predecessor is the fork point', ({ expect }) => {
      const [b1, b2] = read(
        ['b1', { block: '2@a', branch: '2@a', fork: true, prev: '0@a' }],
        ['b2', { block: '3@a', branch: '2@a', prev: '2@a' }],
      );
      expect(Feed.getBranch(b1)).toBe('2@a');
      expect(Feed.isFork(b1)).toBe(true);
      expect(Feed.getPredecessor(b1)).toBe('0@a');
      expect(Feed.getBranch(b2)).toBe('2@a');
      expect(Feed.isFork(b2)).toBe(false);
    });

    test('the local cursor of an item holds its branch and its block', ({ expect }) => {
      const [a1, b1] = read(['a1', { block: '0@a' }], ['b1', { block: '1@a', branch: '1@a', fork: true, prev: '0@a' }]);
      expect(Feed.getLocalCursor(a1)).toBe('|0@a');
      expect(Feed.getLocalCursor(b1)).toBe('1@a|1@a');
      expect(Feed.getLocalCursor(Obj.make(TestSchema.Task, { title: 'unread' }))).toBeUndefined();
    });

    // The worked example from the JSDoc: a branch sees its parent up to the fork point, then itself.
    test('readBranch gives the root without branch items, and a branch its ancestors up to the fork', ({ expect }) => {
      const log = read(
        ['a1', { block: '0@a' }],
        ['a2', { block: '1@a', prev: '0@a' }],
        ['a3', { block: '2@a', prev: '1@a' }],
        ['b1', { block: '3@a', branch: '3@a', fork: true, prev: '1@a' }],
        ['a4', { block: '4@a', prev: '2@a' }],
        ['b2', { block: '5@a', branch: '3@a', prev: '3@a' }],
      );

      const root = Feed.readBranch(log);
      expect(titles(root)).toEqual(['a1', 'a2', 'a3', 'a4']);
      expect(root.shallow).toBe(false);

      const forked = Feed.readBranch(log, Feed.BranchId.make('3@a'));
      expect(titles(forked)).toEqual(['a1', 'a2', 'b1', 'b2']);
      expect(forked.shallow).toBe(false);
    });

    test('a nested branch cuts each ancestor at its own fork point', ({ expect }) => {
      const log = read(
        ['a1', { block: '0@a' }],
        ['a2', { block: '1@a', prev: '0@a' }],
        ['b1', { block: '2@a', branch: '2@a', fork: true, prev: '0@a' }],
        ['a3', { block: '3@a', prev: '1@a' }],
        ['b2', { block: '4@a', branch: '2@a', prev: '2@a' }],
        ['c1', { block: '5@a', branch: '5@a', fork: true, prev: '4@a' }],
        ['b3', { block: '6@a', branch: '2@a', prev: '4@a' }],
        ['c2', { block: '7@a', branch: '5@a', prev: '5@a' }],
      );

      expect(titles(Feed.readBranch(log, Feed.BranchId.make('5@a')))).toEqual(['a1', 'b1', 'b2', 'c1', 'c2']);
      expect(titles(Feed.readBranch(log, Feed.BranchId.make('2@a')))).toEqual(['a1', 'b1', 'b2', 'b3']);
    });

    describe('shallow', () => {
      test('a missing base returns the branch items and reports shallow', ({ expect }) => {
        const log = read(['a1', { block: '0@a' }], ['b2', { block: '2@a', branch: '1@a', prev: '1@a' }]);
        const branch = Feed.readBranch(log, Feed.BranchId.make('1@a'));
        expect(titles(branch)).toEqual(['b2']);
        expect(branch.shallow).toBe(true);
      });

      test('a missing fork point returns the branch items and reports shallow', ({ expect }) => {
        const log = read(['b1', { block: '1@a', branch: '1@a', fork: true, prev: '0@a' }]);
        const branch = Feed.readBranch(log, Feed.BranchId.make('1@a'));
        expect(titles(branch)).toEqual(['b1']);
        expect(branch.shallow).toBe(true);
      });

      test('a fork point after the base is a forward reference', ({ expect }) => {
        const log = read(['b1', { block: '0@a', branch: '0@a', fork: true, prev: '1@a' }], ['a1', { block: '1@a' }]);
        const branch = Feed.readBranch(log, Feed.BranchId.make('0@a'));
        expect(titles(branch)).toEqual(['b1']);
        expect(branch.shallow).toBe(true);
      });
    });
  });
});

const titles = (history: Feed.History<TestSchema.Task>) => history.items.map((item) => item.title);

/** Writes an unparseable lineage id, standing in for a corrupted or future-format replicated block. */
const corruptParent = (task: TestSchema.Task) =>
  Obj.update(task, (task) => {
    Obj.getMeta(task).keys.push({ source: Feed.PARENT_KEY, id: 'not-a-ulid' });
  });
