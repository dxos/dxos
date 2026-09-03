//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  MAX_SEEDED_PLANKS,
  addSubjectsToActiveDeck,
  pushSubjectsToStack,
  resolveLevelOpen,
  resolveSeededPlanks,
  updatePlankNames,
} from './layout.ts';

describe('addSubjectsToActiveDeck', () => {
  test('appends to the end without a pivot', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'])).toEqual(['a', 'b', 'c']);
  });

  test('appends multiple subjects in order', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('inserts immediately after the pivot without truncating', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c', 'd'], ['e'], { pivotId: 'a' })).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  test('inserts multiple subjects after the pivot in order', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['x', 'y'], { pivotId: 'a' })).toEqual(['a', 'x', 'y', 'b', 'c']);
  });

  test('appends to the end when pivot not in deck', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { pivotId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('subject already open keeps its position', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['c'], { pivotId: 'a' })).toEqual(['a', 'b', 'c']);
  });

  test('mixes already-open and new subjects', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['b', 'd'], { pivotId: 'a' })).toEqual(['a', 'd', 'b', 'c']);
  });

  test('a named open replaces the plank holding that name, in place', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'a' })).toEqual(['c', 'b']);
  });

  test('only the first subject takes the name; the rest insert after it', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c', 'd'], { replaceId: 'a' })).toEqual(['c', 'd', 'b']);
  });

  test('a name whose plank is gone falls back to inserting', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('an already-open first subject takes the name without displacing its holder', ({ expect }) => {
    // The name binds to the first subject, so nothing else may take over the named plank — `b` stays
    // open and `c` inserts after `a` rather than replacing it.
    expect(addSubjectsToActiveDeck(['a', 'b'], ['a', 'c'], { replaceId: 'b' })).toEqual(['a', 'c', 'b']);
  });

  test('returns a copy when nothing changes', ({ expect }) => {
    const active = ['a', 'b'];
    const result = addSubjectsToActiveDeck(active, ['a']);
    expect(result).toEqual(active);
    expect(result).not.toBe(active);
  });
});

describe('updatePlankNames', () => {
  test('binds a name to the plank that took it', ({ expect }) => {
    expect(updatePlankNames({}, ['a'], { name: 'message', plankId: 'a' })).toEqual({ message: 'a' });
  });

  test('rebinds a name to the plank that replaced its occupant', ({ expect }) => {
    expect(updatePlankNames({ message: 'a' }, ['b'], { name: 'message', plankId: 'b' })).toEqual({ message: 'b' });
  });

  test('drops names whose plank is no longer open', ({ expect }) => {
    expect(updatePlankNames({ message: 'a', other: 'b' }, ['b'])).toEqual({ other: 'b' });
  });

  test('ignores a binding to a plank that did not end up open', ({ expect }) => {
    expect(updatePlankNames({}, ['a'], { name: 'message', plankId: 'gone' })).toEqual({});
  });
});

describe('resolveSeededPlanks', () => {
  const children = ['doc-1', 'doc-2', 'doc-3'];

  test('seeds a navigation with the node children', ({ expect }) => {
    expect(resolveSeededPlanks({ initial: 'children', addBesideOrigin: false, children })).toEqual(children);
  });

  test('does not seed when the type declares nothing', ({ expect }) => {
    expect(resolveSeededPlanks({ initial: undefined, addBesideOrigin: false, children })).toBeUndefined();
    expect(resolveSeededPlanks({ initial: 'none', addBesideOrigin: false, children })).toBeUndefined();
  });

  // An add is a request to put this node beside what is already open; replacing the deck there would
  // discard the planks the user was working in.
  test('does not seed an add', ({ expect }) => {
    expect(resolveSeededPlanks({ initial: 'children', addBesideOrigin: true, children })).toBeUndefined();
  });

  test('falls through for an empty collection rather than emptying the deck', ({ expect }) => {
    expect(resolveSeededPlanks({ initial: 'children', addBesideOrigin: false, children: [] })).toBeUndefined();
  });

  // Every plank mounts an article surface, so a large collection must not instantiate an editor per
  // document on one navtree click.
  test('caps how many planks a single navigation opens', ({ expect }) => {
    const many = Array.from({ length: 40 }, (_, index) => `doc-${index}`);
    const seeded = resolveSeededPlanks({ initial: 'children', addBesideOrigin: false, children: many });
    expect(seeded).toHaveLength(MAX_SEEDED_PLANKS);
    expect(seeded?.[0]).toBe('doc-0');
  });
});

describe('resolveLevelOpen', () => {
  const root = 'inbox';
  const spec = {
    levels: [{ key: 'mailbox' }, { key: 'message' }, { key: 'attachment' }],
  };
  const open = (args: Partial<Parameters<typeof resolveLevelOpen>[0]> = {}) =>
    resolveLevelOpen({ active: [root], plankNames: {}, spec, root, level: 'message', subjectId: 'msg-1', ...args });

  test('opens the level beside the level above it', ({ expect }) => {
    expect(open()).toEqual({ next: [root, 'msg-1'], name: 'inbox/message' });
  });

  test('reuses the level plank rather than growing the deck, and names the replaced plank', ({ expect }) => {
    const result = open({ active: [root, 'msg-1'], plankNames: { 'inbox/message': 'msg-1' }, subjectId: 'msg-2' });
    expect(result).toEqual({ next: [root, 'msg-2'], name: 'inbox/message', replacedId: 'msg-1' });
  });

  // The point of levels over a bare name: a second message must not leave the first one's attachment
  // stranded beside it.
  test('closes the levels below the one opened', ({ expect }) => {
    const result = open({
      active: [root, 'msg-1', 'att-1'],
      plankNames: { 'inbox/message': 'msg-1', 'inbox/attachment': 'att-1' },
      subjectId: 'msg-2',
    });
    expect(result?.next).toEqual([root, 'msg-2']);
  });

  test('opening a deeper level leaves the shallower ones alone', ({ expect }) => {
    const result = open({
      active: [root, 'msg-1'],
      plankNames: { 'inbox/message': 'msg-1' },
      level: 'attachment',
      subjectId: 'att-1',
    });
    expect(result).toEqual({ next: [root, 'msg-1', 'att-1'], name: 'inbox/attachment' });
  });

  test('anchors to the level above, not the end of the deck', ({ expect }) => {
    const result = open({ active: [root, 'unrelated'], subjectId: 'msg-1' });
    expect(result?.next).toEqual([root, 'msg-1', 'unrelated']);
  });

  test('returns undefined for a level the chain does not declare', ({ expect }) => {
    expect(open({ level: 'draft' })).toBeUndefined();
    expect(open({ spec: undefined })).toBeUndefined();
    expect(open({ spec: { levels: [] } })).toBeUndefined();
  });
});

describe('pushSubjectsToStack', () => {
  test('pushes a new subject onto the top of the stack', ({ expect }) => {
    expect(pushSubjectsToStack(['a', 'b'], ['c'])).toEqual(['a', 'b', 'c']);
  });

  test('moves an already-open subject to the top instead of duplicating it', ({ expect }) => {
    expect(pushSubjectsToStack(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c', 'b']);
  });

  test('pushes multiple subjects in order, last on top', ({ expect }) => {
    expect(pushSubjectsToStack(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('is a no-op re-push when the subject is already on top', ({ expect }) => {
    expect(pushSubjectsToStack(['a', 'b'], ['b'])).toEqual(['a', 'b']);
  });

  test('pushes onto an empty stack', ({ expect }) => {
    expect(pushSubjectsToStack([], ['a'])).toEqual(['a']);
  });
});
