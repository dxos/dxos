//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  carryCompanion,
  findAttendedPlank,
  getRenderedPlanks,
  resolveCompanionAnchor,
  resolveCompanionPlank,
} from './companion-anchor';

describe('getRenderedPlanks', () => {
  test('lays out every active plank by default', ({ expect }) => {
    expect(getRenderedPlanks(['a', 'b', 'c'], false)).toEqual(['a', 'b', 'c']);
    expect(getRenderedPlanks(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });

  test('flatten collapses the stack to the current plank', ({ expect }) => {
    expect(getRenderedPlanks(['a', 'b', 'c'], true)).toEqual(['c']);
    expect(getRenderedPlanks([], true)).toEqual([]);
  });
});

describe('findAttendedPlank', () => {
  test('has no result when attention points outside the deck', ({ expect }) => {
    expect(findAttendedPlank(['a', 'b'], [])).toBeUndefined();
    expect(findAttendedPlank(['a', 'b'], ['z'])).toBeUndefined();
  });

  test('matches attention nested inside a plank', ({ expect }) => {
    expect(findAttendedPlank(['a', 'b'], ['b/~assistant'])).toBe('b');
  });

  test('a nested plank wins over the plank whose id prefixes it', ({ expect }) => {
    // A mailbox opens its messages as `<mailbox>/<message>` planks, so both are open and one prefixes
    // the other; attention on the message must not resolve back to the mailbox.
    expect(findAttendedPlank(['mailbox', 'mailbox/message-1'], ['mailbox/message-1'])).toBe('mailbox/message-1');
    expect(findAttendedPlank(['mailbox', 'mailbox/message-1'], ['mailbox/message-1/~assistant'])).toBe(
      'mailbox/message-1',
    );
    expect(findAttendedPlank(['mailbox', 'mailbox/message-1'], ['mailbox'])).toBe('mailbox');
  });
});

describe('resolveCompanionAnchor', () => {
  test('anchors to the attended plank rather than the last one', ({ expect }) => {
    expect(resolveCompanionAnchor(['a', 'b', 'c'], ['b'])).toBe('b');
  });

  test('matches attention nested inside a plank, including the companion pane itself', ({ expect }) => {
    expect(resolveCompanionAnchor(['a', 'b'], ['a/~assistant'])).toBe('a');
    expect(resolveCompanionAnchor(['a', 'b'], ['a/child'])).toBe('a');
  });

  test('falls back to the last plank when nothing attended is open', ({ expect }) => {
    expect(resolveCompanionAnchor(['a', 'b'], [])).toBe('b');
    expect(resolveCompanionAnchor(['a', 'b'], ['z'])).toBe('b');
  });

  test('prefers the most recently attended plank that is still open', ({ expect }) => {
    expect(resolveCompanionAnchor(['a', 'b'], ['z', 'a'])).toBe('a');
  });

  test('a flattened deck anchors to the current plank whatever is attended', ({ expect }) => {
    // The pairing url-handler and DeckViewport both go through: attention on an earlier plank must not
    // anchor the companion outside the single rendered tile.
    expect(resolveCompanionAnchor(getRenderedPlanks(['a', 'b'], true), ['a'])).toBe('b');
  });

  test('an empty deck has no anchor', ({ expect }) => {
    expect(resolveCompanionAnchor([], ['a'])).toBeUndefined();
  });
});

describe('carryCompanion', () => {
  test('an open companion follows the plank the new one replaces', ({ expect }) => {
    // A nav-tree click replaces the deck: `a` closes, so pruning has already dropped its entry.
    expect(carryCompanion({ pruned: [], previous: ['a'], replacedId: 'a', replacementId: 'b' })).toEqual(['b']);
  });

  test('a companion closed on the replaced plank stays closed', ({ expect }) => {
    expect(carryCompanion({ pruned: [], previous: [], replacedId: 'a', replacementId: 'b' })).toEqual([]);
    expect(carryCompanion({ pruned: [], previous: ['other'], replacedId: 'a', replacementId: 'b' })).toEqual([]);
  });

  test('an open that replaces nothing leaves the pruned state alone', ({ expect }) => {
    expect(carryCompanion({ pruned: ['a'], previous: ['a'], replacedId: undefined, replacementId: 'b' })).toEqual([
      'a',
    ]);
    expect(carryCompanion({ pruned: ['a'], previous: ['a'], replacedId: 'a', replacementId: undefined })).toEqual([
      'a',
    ]);
  });

  test('the surviving planks keep their own companion state', ({ expect }) => {
    expect(carryCompanion({ pruned: ['c'], previous: ['a', 'c'], replacedId: 'a', replacementId: 'b' })).toEqual([
      'c',
      'b',
    ]);
  });

  test('does not duplicate a replacement whose companion is already open', ({ expect }) => {
    expect(carryCompanion({ pruned: ['b'], previous: ['a', 'b'], replacedId: 'a', replacementId: 'b' })).toEqual(['b']);
  });
});

describe('resolveCompanionPlank', () => {
  test('a qualified companion id targets its own plank', ({ expect }) => {
    expect(resolveCompanionPlank({ subject: 'a/~comments', planks: ['a', 'b'], attended: ['b'] })).toBe('a');
    expect(
      resolveCompanionPlank({ subject: 'mailbox/message-1/~comments', planks: ['mailbox/message-1'], attended: [] }),
    ).toBe('mailbox/message-1');
  });

  test('a bare variant targets the attended plank', ({ expect }) => {
    // `~comments` is what CommentOperation.Create passes: it knows the variant, not the plank.
    expect(resolveCompanionPlank({ subject: '~comments', planks: ['a', 'b'], attended: ['a'] })).toBe('a');
    expect(resolveCompanionPlank({ subject: '~comments', planks: ['a', 'b'], attended: [] })).toBe('b');
  });

  test('an explicit anchor wins over attention for a bare variant', ({ expect }) => {
    expect(resolveCompanionPlank({ subject: '~comments', anchor: 'a', planks: ['a', 'b'], attended: ['b'] })).toBe('a');
  });

  test('an anchor does not override the plank a qualified id names', ({ expect }) => {
    expect(resolveCompanionPlank({ subject: 'a/~comments', anchor: 'b', planks: ['a', 'b'], attended: ['b'] })).toBe(
      'a',
    );
  });

  test('a bare variant has no target when the deck is empty', ({ expect }) => {
    expect(resolveCompanionPlank({ subject: '~comments', planks: [], attended: [] })).toBeUndefined();
  });
});
