//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  addSubjectsToActiveDeck,
  detachDetail,
  detailChain,
  detailName,
  matchOpenEntities,
  prunePlankNames,
  pushSubjectsToStack,
  resolveDetailOpen,
  setDetail,
} from './layout.ts';

/** Plank names holding each owner's detail. */
const details = (links: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(links).map(([owner, detail]) => [detailName(owner), detail]));

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

  test('replaces `replaceId` in place', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'a' })).toEqual(['c', 'b']);
  });

  test('only the first subject replaces; the rest insert after it', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c', 'd'], { replaceId: 'a' })).toEqual(['c', 'd', 'b']);
  });

  test('a `replaceId` that is not open falls back to inserting', ({ expect }) => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('an already-open first subject keeps its place and leaves `replaceId` open', ({ expect }) => {
    // Only the first subject may replace, so `b` stays open and `c` inserts after `a`.
    expect(addSubjectsToActiveDeck(['a', 'b'], ['a', 'c'], { replaceId: 'b' })).toEqual(['a', 'c', 'b']);
  });

  test('returns a copy when nothing changes', ({ expect }) => {
    const active = ['a', 'b'];
    const result = addSubjectsToActiveDeck(active, ['a']);
    expect(result).toEqual(active);
    expect(result).not.toBe(active);
  });
});

describe('details', () => {
  const chain = details({ 'inbox': 'msg-1', 'msg-1': 'att-1' });

  test('detailChain follows details nearest first', ({ expect }) => {
    expect(detailChain(chain, 'inbox')).toEqual(['msg-1', 'att-1']);
    expect(detailChain(chain, 'att-1')).toEqual([]);
  });

  test('detailChain stops at a cycle', ({ expect }) => {
    expect(detailChain(details({ a: 'b', b: 'a' }), 'a')).toEqual(['b']);
  });

  test('setDetail drops the chain hanging off the previous detail', ({ expect }) => {
    expect(setDetail(chain, 'inbox', 'msg-2')).toEqual(details({ inbox: 'msg-2' }));
  });

  test('setDetail with the current detail keeps its chain', ({ expect }) => {
    expect(setDetail(chain, 'inbox', 'msg-1')).toEqual(chain);
  });

  test('detachDetail leaves the plank open when its owner closes', ({ expect }) => {
    const names = detachDetail({ ...chain, preview: 'msg-1' }, 'msg-1');
    expect(detailChain(names, 'inbox')).toEqual([]);
    expect(detailChain(names, 'msg-1')).toEqual(['att-1']);
    expect(names.preview).toBe('msg-1');
  });

  test('setDetail leaves other names alone', ({ expect }) => {
    expect(setDetail({ ...chain, preview: 'doc' }, 'inbox', 'msg-2')).toEqual({
      ...details({ inbox: 'msg-2' }),
      preview: 'doc',
    });
  });

  // Under flatten the detail is not open as a plank, so detail names are kept while an open plank reaches them.
  test('prunePlankNames keeps the details an open plank reaches', ({ expect }) => {
    expect(prunePlankNames({ ...chain, ...details({ gone: 'x' }) }, ['inbox'])).toEqual(chain);
    expect(prunePlankNames(chain, [])).toEqual({});
  });

  test('prunePlankNames keeps other names only while their plank is open', ({ expect }) => {
    expect(prunePlankNames({ preview: 'doc', reader: 'gone' }, ['doc'])).toEqual({ preview: 'doc' });
  });
});

describe('resolveDetailOpen', () => {
  describe('flattened', () => {
    test('the main plank keeps its place and the detail goes to the companion', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox'],
        plankNames: details({}),
        pivot: 'inbox',
        subject: 'msg-1',
        flatten: true,
      });
      expect(result).toEqual({ next: ['inbox'], plankNames: details({ inbox: 'msg-1' }), inCompanion: true });
    });

    test('a detail of the companion promotes it into the main plank', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox'],
        plankNames: details({ inbox: 'msg-1' }),
        pivot: 'msg-1',
        subject: 'att-1',
        flatten: true,
      });
      expect(result).toEqual({
        next: ['inbox', 'msg-1'],
        plankNames: details({ 'inbox': 'msg-1', 'msg-1': 'att-1' }),
        inCompanion: true,
      });
    });

    test('a new detail of an earlier crumb returns to it and drops the old chain', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox', 'msg-1'],
        plankNames: details({ 'inbox': 'msg-1', 'msg-1': 'att-1' }),
        pivot: 'inbox',
        subject: 'msg-2',
        flatten: true,
      });
      expect(result).toEqual({ next: ['inbox'], plankNames: details({ inbox: 'msg-2' }), inCompanion: true });
    });

    test('a pivot that is not open falls back to the caller', ({ expect }) => {
      expect(
        resolveDetailOpen({
          active: ['other'],
          plankNames: details({}),
          pivot: 'inbox',
          subject: 'msg-1',
          flatten: true,
        }),
      ).toBeUndefined();
    });
  });

  describe('not flattened', () => {
    test('the first detail opens beside its pivot', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox', 'doc'],
        plankNames: details({}),
        pivot: 'inbox',
        subject: 'msg-1',
      });
      expect(result?.next).toEqual(['inbox', 'msg-1', 'doc']);
      expect(result?.plankNames).toEqual(details({ inbox: 'msg-1' }));
      expect(result?.inCompanion).toBe(false);
    });

    // Reading a second message must not leave the first one's attachment beside an unrelated message.
    test('a new detail replaces the previous one in place and closes its details', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox', 'msg-1', 'att-1', 'doc'],
        plankNames: details({ 'inbox': 'msg-1', 'msg-1': 'att-1' }),
        pivot: 'inbox',
        subject: 'msg-2',
      });
      expect(result?.next).toEqual(['inbox', 'msg-2', 'doc']);
      expect(result?.plankNames).toEqual(details({ inbox: 'msg-2' }));
      expect(result?.replacedId).toBe('msg-1');
    });

    test('a detail of a detail leaves the shallower one in place', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox', 'msg-1'],
        plankNames: details({ inbox: 'msg-1' }),
        pivot: 'msg-1',
        subject: 'att-1',
      });
      expect(result?.next).toEqual(['inbox', 'msg-1', 'att-1']);
      expect(result?.plankNames).toEqual(details({ 'inbox': 'msg-1', 'msg-1': 'att-1' }));
    });

    test('a previous detail open elsewhere closes rather than stays', ({ expect }) => {
      const result = resolveDetailOpen({
        active: ['inbox', 'msg-1', 'msg-2'],
        plankNames: details({ inbox: 'msg-1' }),
        pivot: 'inbox',
        subject: 'msg-2',
      });
      expect(result?.next).toEqual(['inbox', 'msg-2']);
    });

    test('reselecting the open detail changes nothing', ({ expect }) => {
      const plankNames = details({ 'inbox': 'msg-1', 'msg-1': 'att-1' });
      const result = resolveDetailOpen({
        active: ['inbox', 'msg-1', 'att-1'],
        plankNames,
        pivot: 'inbox',
        subject: 'msg-1',
      });
      expect(result?.next).toEqual(['inbox', 'msg-1', 'att-1']);
      expect(result?.plankNames).toEqual(plankNames);
    });

    test('a pivot that is not open falls back to the caller', ({ expect }) => {
      expect(
        resolveDetailOpen({ active: ['doc'], plankNames: details({}), pivot: 'inbox', subject: 'msg-1' }),
      ).toBeUndefined();
    });
  });

  test('a stack pushes the detail after closing the previous one', ({ expect }) => {
    const result = resolveDetailOpen({
      active: ['inbox', 'msg-1', 'att-1'],
      plankNames: details({ 'inbox': 'msg-1', 'msg-1': 'att-1' }),
      pivot: 'inbox',
      subject: 'msg-2',
      flatten: true,
      stack: true,
    });
    expect(result?.next).toEqual(['inbox', 'msg-2']);
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

describe('matchOpenEntities', () => {
  // Two paths to one object: `x/obj` and `y/obj`.
  const entityOf = (id: string) => id.split('/').at(-1);

  test('a re-homing open moves the open plank onto the new path', ({ expect }) => {
    const result = matchOpenEntities({ active: ['a', 'x/obj'], subjects: ['y/obj'], entityOf, rehome: true });
    expect(result.active).toEqual(['a', 'y/obj']);
    expect(result.subjects).toEqual(['y/obj']);
    expect([...result.moved]).toEqual([['x/obj', 'y/obj']]);
  });

  test('any other open reuses the open plank', ({ expect }) => {
    const result = matchOpenEntities({ active: ['a', 'x/obj'], subjects: ['y/obj'], entityOf, rehome: false });
    expect(result.active).toEqual(['a', 'x/obj']);
    expect(result.subjects).toEqual(['x/obj']);
    expect(result.moved.size).toBe(0);
  });

  test('a subject already open under its own path changes nothing', ({ expect }) => {
    const result = matchOpenEntities({ active: ['x/obj'], subjects: ['x/obj'], entityOf, rehome: true });
    expect(result.active).toEqual(['x/obj']);
    expect(result.moved.size).toBe(0);
  });

  test('a subject without an entity passes through', ({ expect }) => {
    const result = matchOpenEntities({
      active: ['x/obj'],
      subjects: ['settings'],
      entityOf: () => undefined,
      rehome: true,
    });
    expect(result).toEqual({ active: ['x/obj'], subjects: ['settings'], moved: new Map() });
  });
});
