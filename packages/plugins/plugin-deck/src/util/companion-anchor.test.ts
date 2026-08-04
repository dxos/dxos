//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { findAttendedPlank, getRenderedPlanks, resolveCompanionAnchor } from './companion-anchor';

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
