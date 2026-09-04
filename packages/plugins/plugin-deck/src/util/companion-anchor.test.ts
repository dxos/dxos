//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  closeCompanionPlank,
  findAttendedPlank,
  getRenderedPlanks,
  isCompanionOpen,
  openCompanionPlank,
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

describe('the companion flag', () => {
  test('is per plank while the deck slides', ({ expect }) => {
    expect(isCompanionOpen(['a'], false, 'a')).toBe(true);
    expect(isCompanionOpen(['a'], false, 'b')).toBe(false);
    expect(openCompanionPlank(['a'], false, 'b')).toEqual(['a', 'b']);
    expect(openCompanionPlank(['a'], false, 'a')).toEqual(['a']);
    expect(closeCompanionPlank(['a', 'b'], false, 'a')).toEqual(['b']);
  });

  test('is deck-wide under flatten, so it survives moving to another plank', ({ expect }) => {
    // The entry names the plank the companion was opened on; flat mode renders one plank at a time, so
    // navigating to another article must find it still open.
    expect(isCompanionOpen(['a'], true, 'b')).toBe(true);
    expect(isCompanionOpen([], true, 'b')).toBe(false);
    expect(openCompanionPlank(['a'], true, 'b')).toEqual(['b']);
    expect(closeCompanionPlank(['a'], true, 'b')).toEqual([]);
  });
});
