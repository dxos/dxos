//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Feed from './Feed';
import * as Obj from './Obj';
import { TestSchema } from './testing';

describe('Feed', () => {
  describe('getParent / setParent', () => {
    test('an item has no explicit parent by default', ({ expect }) => {
      expect(Feed.getParent(message('m1'))).toBeUndefined();
    });

    test('round-trips a parent set from an item', ({ expect }) => {
      const m1 = message('m1');
      const m2 = message('m2');
      Feed.setParent(m2, m1);
      expect(Feed.getParent(m2)).toBe(m1.id);
    });

    test('round-trips a parent set from an id', ({ expect }) => {
      const m1 = message('m1');
      const m2 = message('m2');
      Feed.setParent(m2, m1.id);
      expect(Feed.getParent(m2)).toBe(m1.id);
    });

    test('re-setting replaces rather than accumulates', ({ expect }) => {
      const m1 = message('m1');
      const m2 = message('m2');
      const m3 = message('m3');
      Feed.setParent(m3, m1);
      Feed.setParent(m3, m2);
      expect(Feed.getParent(m3)).toBe(m2.id);
      expect(Obj.getKeys(m3, Feed.PARENT_KEY)).toHaveLength(1);
    });

    test('undefined clears the parent', ({ expect }) => {
      const m1 = message('m1');
      const m2 = message('m2');
      Feed.setParent(m2, m1);
      Feed.setParent(m2, undefined);
      expect(Feed.getParent(m2)).toBeUndefined();
    });
  });

  describe('history', () => {
    test('a feed with no lineage resolves to itself', ({ expect }) => {
      const items = [message('m1'), message('m2'), message('m3')];
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
      const [m1, m2, m3, m4, m5] = [message('m1'), message('m2'), message('m3'), message('m4'), message('m5')];
      Feed.setParent(m5, m3);
      const history = Feed.history([m1, m2, m3, m4, m5]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm5']);
      expect(history.shallow).toBe(false);
    });

    // Latest-wins: a second fork from m4 makes m4's branch live again and hides m5.
    test('the most recently appended branch wins', ({ expect }) => {
      const [m1, m2, m3, m4, m5, m6] = [
        message('m1'),
        message('m2'),
        message('m3'),
        message('m4'),
        message('m5'),
        message('m6'),
      ];
      Feed.setParent(m5, m3);
      Feed.setParent(m6, m4);
      const history = Feed.history([m1, m2, m3, m4, m5, m6]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm4', 'm6']);
      expect(history.shallow).toBe(false);
    });

    test('items appended after a fork chain onto it implicitly', ({ expect }) => {
      const [m1, m2, m3, m4, m5, m6] = [
        message('m1'),
        message('m2'),
        message('m3'),
        message('m4'),
        message('m5'),
        message('m6'),
      ];
      Feed.setParent(m5, m3);
      const history = Feed.history([m1, m2, m3, m4, m5, m6]);
      expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm5', 'm6']);
    });

    test('consecutive forks from the same parent keep only the last', ({ expect }) => {
      const [m1, m2, m3, m4] = [message('m1'), message('m2'), message('m3'), message('m4')];
      Feed.setParent(m3, m1);
      Feed.setParent(m4, m1);
      const history = Feed.history([m1, m2, m3, m4]);
      expect(titles(history)).toEqual(['m1', 'm4']);
    });

    describe('head', () => {
      test('resolves an abandoned branch when given its leaf', ({ expect }) => {
        const [m1, m2, m3, m4, m5] = [message('m1'), message('m2'), message('m3'), message('m4'), message('m5')];
        Feed.setParent(m5, m3);
        const history = Feed.history([m1, m2, m3, m4, m5], { head: m4 });
        expect(titles(history)).toEqual(['m1', 'm2', 'm3', 'm4']);
        expect(history.shallow).toBe(false);
      });

      test('accepts an id', ({ expect }) => {
        const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];
        const history = Feed.history([m1, m2, m3], { head: m2.id });
        expect(titles(history)).toEqual(['m1', 'm2']);
      });

      test('an unknown head resolves to nothing and reports truncation', ({ expect }) => {
        const history = Feed.history([message('m1')], { head: message('absent') });
        expect(history.items).toEqual([]);
        expect(history.shallow).toBe(true);
      });
    });

    describe('truncation', () => {
      // A parent may legitimately be missing under partial replication, or because the caller's
      // filter excluded it.
      test('an absent parent stops the walk', ({ expect }) => {
        const [m1, m2] = [message('m1'), message('m2')];
        Feed.setParent(m2, message('unreplicated'));
        const history = Feed.history([m1, m2]);
        expect(titles(history)).toEqual(['m2']);
        expect(history.shallow).toBe(true);
      });

      test('a forward reference terminates the walk', ({ expect }) => {
        const [m1, m2] = [message('m1'), message('m2')];
        Feed.setParent(m1, m2);
        const history = Feed.history([m1, m2]);
        expect(titles(history)).toEqual(['m1', 'm2']);
        expect(history.shallow).toBe(true);
      });

      test('a self-reference terminates the walk', ({ expect }) => {
        const m1 = message('m1');
        Feed.setParent(m1, m1);
        const history = Feed.history([m1]);
        expect(titles(history)).toEqual(['m1']);
        expect(history.shallow).toBe(true);
      });

      // A malformed replicated id must not read as "no parent" — that would resolve the fork as an
      // implicit continuation and resurrect the items it abandoned.
      test('a malformed parent id truncates rather than falling through to the predecessor', ({ expect }) => {
        const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];
        corruptParent(m3);
        const history = Feed.history([m1, m2, m3]);
        expect(titles(history)).toEqual(['m3']);
        expect(history.shallow).toBe(true);
      });

      test('getParent reports a malformed parent as undefined', ({ expect }) => {
        const m1 = message('m1');
        corruptParent(m1);
        expect(Feed.getParent(m1)).toBeUndefined();
      });
    });
  });

  describe('Reset', () => {
    test('isReset distinguishes a fork marker from feed content', ({ expect }) => {
      expect(Feed.isReset(Feed.makeReset())).toBe(true);
      expect(Feed.isReset(message('m1'))).toBe(false);
    });

    test('a reset abandons everything appended after its parent', ({ expect }) => {
      const [m1, m2, m3, m4] = [message('m1'), message('m2'), message('m3'), message('m4')];
      const reset = Feed.makeReset(m2);
      const m5 = message('m5');

      const history = Feed.history([m1, m2, m3, m4, reset, m5]);
      expect(ids(history)).toEqual([m1.id, m2.id, reset.id, m5.id]);
      expect(history.shallow).toBe(false);
    });

    test('a parentless reset starts the history over', ({ expect }) => {
      const [m1, m2] = [message('m1'), message('m2')];
      const reset = Feed.makeReset();
      const m3 = message('m3');

      const history = Feed.history([m1, m2, reset, m3]);
      expect(ids(history)).toEqual([reset.id, m3.id]);
      // Not a boundary: nothing earlier is missing, there deliberately is nothing earlier.
      expect(history.shallow).toBe(false);
    });

    // The negative control for the case above: an absent parent means "continues from its predecessor"
    // for ordinary items, and only a reset's absent parent means "resume from nothing". Without the
    // distinction the walk would fall through and resurrect the whole conversation.
    test('an ordinary item with no parent continues from its predecessor instead', ({ expect }) => {
      const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];

      const history = Feed.history([m1, m2, m3]);
      expect(ids(history)).toEqual([m1.id, m2.id, m3.id]);
    });

    test('a later reset supersedes an earlier one', ({ expect }) => {
      const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];
      const first = Feed.makeReset(m2);
      const second = Feed.makeReset(m1);

      // Latest-wins, as everywhere else: the walk starts at the tip, so only the last fork is live.
      const history = Feed.history([m1, m2, m3, first, second]);
      expect(ids(history)).toEqual([m1.id, second.id]);
    });
  });
});

const message = (title: string) => Obj.make(TestSchema.Task, { title });

const titles = (history: Feed.History<TestSchema.Task>) => history.items.map((item) => item.title);

/** Ids rather than titles, for histories that mix content with fork markers. */
const ids = (history: Feed.History<TestSchema.Task | Feed.Reset>) => history.items.map((item) => item.id);

/** Writes an unparseable lineage id, standing in for a corrupted or future-format replicated block. */
const corruptParent = (task: TestSchema.Task) =>
  Obj.update(task, (task) => {
    Obj.getMeta(task).keys.push({ source: Feed.PARENT_KEY, id: 'not-a-ulid' });
  });
