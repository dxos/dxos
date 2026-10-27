//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

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
    const make = (...names: string[]) => names.map((title) => Obj.make(TestSchema.Task, { title }));

    test('an item with no branch key is on the main branch', ({ expect }) => {
      const [a1] = make('a1');
      expect(Feed.getBranch(a1)).toBeUndefined();
      expect(Feed.isMain(a1)).toBe(true);
      expect(Feed.getForkPoint(a1)).toBeUndefined();
    });

    test('startBranch names the branch after its first item and flags the fork point', ({ expect }) => {
      const [a1, b1, b2] = make('a1', 'b1', 'b2');
      const branch = Feed.startBranch(b1, a1);
      Feed.setBranch(b2, branch);
      expect(branch).toBe(b1.id);
      expect(Feed.getBranch(b1)).toBe(b1.id);
      expect(Feed.getForkPoint(b1)).toBe(a1.id);
      expect(Feed.getBranch(b2)).toBe(b1.id);
      expect(Feed.getForkPoint(b2)).toBeUndefined();
      expect(Feed.isMain(b2)).toBe(false);
    });

    test('setBranch replaces rather than accumulates, and undefined returns the item to main', ({ expect }) => {
      const [a1, b1, c1] = make('a1', 'b1', 'c1');
      Feed.setBranch(a1, b1.id);
      Feed.setBranch(a1, c1.id);
      expect(Obj.getMeta(a1).keys.filter((key) => key.source === Feed.BRANCH_KEY)).toHaveLength(1);
      expect(Feed.getBranch(a1)).toBe(c1.id);
      Feed.setBranch(a1, undefined);
      expect(Feed.isMain(a1)).toBe(true);
    });

    // The worked example from the JSDoc: a branch sees its parent up to the fork point, then itself.
    test('readBranch gives main without branch items, and a branch its ancestors up to the fork', ({ expect }) => {
      const [a1, a2, a3, b1, a4, b2] = make('a1', 'a2', 'a3', 'b1', 'a4', 'b2');
      const branch = Feed.startBranch(b1, a2);
      Feed.setBranch(b2, branch);
      const log = [a1, a2, a3, b1, a4, b2];

      const main = Feed.readBranch(log);
      expect(titles(main)).toEqual(['a1', 'a2', 'a3', 'a4']);
      expect(main.shallow).toBe(false);

      const forked = Feed.readBranch(log, branch);
      expect(titles(forked)).toEqual(['a1', 'a2', 'b1', 'b2']);
      expect(forked.shallow).toBe(false);
    });

    test('a nested branch cuts each ancestor at its own fork point', ({ expect }) => {
      const [a1, a2, b1, a3, b2, c1, b3, c2] = make('a1', 'a2', 'b1', 'a3', 'b2', 'c1', 'b3', 'c2');
      const b = Feed.startBranch(b1, a1);
      Feed.setBranch(b2, b);
      Feed.setBranch(b3, b);
      const c = Feed.startBranch(c1, b2);
      Feed.setBranch(c2, c);
      const log = [a1, a2, b1, a3, b2, c1, b3, c2];

      expect(titles(Feed.readBranch(log, c))).toEqual(['a1', 'b1', 'b2', 'c1', 'c2']);
      expect(titles(Feed.readBranch(log, b))).toEqual(['a1', 'b1', 'b2', 'b3']);
    });

    test('a first item with no fork point starts a branch with no ancestors', ({ expect }) => {
      const [a1, b1, b2] = make('a1', 'b1', 'b2');
      Feed.setBranch(b1, b1.id);
      Feed.setBranch(b2, b1.id);
      const read = Feed.readBranch([a1, b1, b2], b1.id);
      expect(titles(read)).toEqual(['b1', 'b2']);
      expect(read.shallow).toBe(false);
    });

    describe('shallow', () => {
      test('a missing first item returns the branch items and reports shallow', ({ expect }) => {
        const [a1, b1, b2] = make('a1', 'b1', 'b2');
        const branch = Feed.startBranch(b1, a1);
        Feed.setBranch(b2, branch);
        const read = Feed.readBranch([a1, b2], branch);
        expect(titles(read)).toEqual(['b2']);
        expect(read.shallow).toBe(true);
      });

      test('a missing fork point returns the branch items and reports shallow', ({ expect }) => {
        const [a1, b1] = make('a1', 'b1');
        const branch = Feed.startBranch(b1, a1);
        const read = Feed.readBranch([b1], branch);
        expect(titles(read)).toEqual(['b1']);
        expect(read.shallow).toBe(true);
      });

      test('a fork point after the first item is a forward reference', ({ expect }) => {
        const [b1, a1] = make('b1', 'a1');
        const branch = Feed.startBranch(b1, a1);
        const read = Feed.readBranch([b1, a1], branch);
        expect(titles(read)).toEqual(['b1']);
        expect(read.shallow).toBe(true);
      });

      test('an item with a malformed branch id is on no branch', ({ expect }) => {
        const [a1, a2] = make('a1', 'a2');
        Obj.update(a2, (a2) => {
          Obj.getMeta(a2).keys.push({ source: Feed.BRANCH_KEY, id: 'not-a-ulid' });
        });
        expect(Feed.isMain(a2)).toBe(false);
        expect(titles(Feed.readBranch([a1, a2]))).toEqual(['a1']);
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
