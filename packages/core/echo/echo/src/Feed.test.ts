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

  describe('resolveBranch', () => {
    test('a feed with no lineage resolves to itself', ({ expect }) => {
      const items = [message('m1'), message('m2'), message('m3')];
      const branch = Feed.resolveBranch(items);
      expect(titles(branch)).toEqual(['m1', 'm2', 'm3']);
      expect(branch.truncated).toBe(false);
    });

    test('an empty feed resolves to nothing', ({ expect }) => {
      const branch = Feed.resolveBranch([]);
      expect(branch.items).toEqual([]);
      expect(branch.truncated).toBe(false);
    });

    // The worked example: forking from m3 abandons m4 without removing it from the log.
    test('a fork discards the items appended between the parent and the fork', ({ expect }) => {
      const [m1, m2, m3, m4, m5] = [message('m1'), message('m2'), message('m3'), message('m4'), message('m5')];
      Feed.setParent(m5, m3);
      const branch = Feed.resolveBranch([m1, m2, m3, m4, m5]);
      expect(titles(branch)).toEqual(['m1', 'm2', 'm3', 'm5']);
      expect(branch.truncated).toBe(false);
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
      const branch = Feed.resolveBranch([m1, m2, m3, m4, m5, m6]);
      expect(titles(branch)).toEqual(['m1', 'm2', 'm3', 'm4', 'm6']);
      expect(branch.truncated).toBe(false);
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
      const branch = Feed.resolveBranch([m1, m2, m3, m4, m5, m6]);
      expect(titles(branch)).toEqual(['m1', 'm2', 'm3', 'm5', 'm6']);
    });

    test('consecutive forks from the same parent keep only the last', ({ expect }) => {
      const [m1, m2, m3, m4] = [message('m1'), message('m2'), message('m3'), message('m4')];
      Feed.setParent(m3, m1);
      Feed.setParent(m4, m1);
      const branch = Feed.resolveBranch([m1, m2, m3, m4]);
      expect(titles(branch)).toEqual(['m1', 'm4']);
    });

    describe('head', () => {
      test('resolves an abandoned branch when given its leaf', ({ expect }) => {
        const [m1, m2, m3, m4, m5] = [message('m1'), message('m2'), message('m3'), message('m4'), message('m5')];
        Feed.setParent(m5, m3);
        const branch = Feed.resolveBranch([m1, m2, m3, m4, m5], { head: m4 });
        expect(titles(branch)).toEqual(['m1', 'm2', 'm3', 'm4']);
        expect(branch.truncated).toBe(false);
      });

      test('accepts an id', ({ expect }) => {
        const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];
        const branch = Feed.resolveBranch([m1, m2, m3], { head: m2.id });
        expect(titles(branch)).toEqual(['m1', 'm2']);
      });

      test('an unknown head resolves to nothing and reports truncation', ({ expect }) => {
        const branch = Feed.resolveBranch([message('m1')], { head: message('absent') });
        expect(branch.items).toEqual([]);
        expect(branch.truncated).toBe(true);
      });
    });

    describe('truncation', () => {
      // A parent may legitimately be missing under partial replication, or because the caller's
      // filter excluded it.
      test('an absent parent stops the walk', ({ expect }) => {
        const [m1, m2] = [message('m1'), message('m2')];
        Feed.setParent(m2, message('unreplicated'));
        const branch = Feed.resolveBranch([m1, m2]);
        expect(titles(branch)).toEqual(['m2']);
        expect(branch.truncated).toBe(true);
      });

      test('a forward reference terminates the walk', ({ expect }) => {
        const [m1, m2] = [message('m1'), message('m2')];
        Feed.setParent(m1, m2);
        const branch = Feed.resolveBranch([m1, m2]);
        expect(titles(branch)).toEqual(['m1', 'm2']);
        expect(branch.truncated).toBe(true);
      });

      test('a self-reference terminates the walk', ({ expect }) => {
        const m1 = message('m1');
        Feed.setParent(m1, m1);
        const branch = Feed.resolveBranch([m1]);
        expect(titles(branch)).toEqual(['m1']);
        expect(branch.truncated).toBe(true);
      });

      // A malformed replicated id must not read as "no parent" — that would resolve the fork as an
      // implicit continuation and resurrect the items it abandoned.
      test('a malformed parent id truncates rather than falling through to the predecessor', ({ expect }) => {
        const [m1, m2, m3] = [message('m1'), message('m2'), message('m3')];
        corruptParent(m3);
        const branch = Feed.resolveBranch([m1, m2, m3]);
        expect(titles(branch)).toEqual(['m3']);
        expect(branch.truncated).toBe(true);
      });

      test('getParent reports a malformed parent as undefined', ({ expect }) => {
        const m1 = message('m1');
        corruptParent(m1);
        expect(Feed.getParent(m1)).toBeUndefined();
      });
    });
  });
});

const message = (title: string) => Obj.make(TestSchema.Task, { title });

const titles = (branch: Feed.Branch<TestSchema.Task>) => branch.items.map((item) => item.title);

/** Writes an unparseable lineage id, standing in for a corrupted or future-format replicated block. */
const corruptParent = (task: TestSchema.Task) =>
  Obj.update(task, (task) => {
    Obj.getMeta(task).keys.push({ source: Feed.PARENT_KEY, id: 'not-a-ulid' });
  });
