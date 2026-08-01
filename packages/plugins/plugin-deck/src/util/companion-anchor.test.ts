//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { resolveCompanionAnchor } from './companion-anchor';

describe('resolveCompanionAnchor', () => {
  test('anchors to the attended plank rather than the last one', () => {
    expect(resolveCompanionAnchor(['a', 'b', 'c'], ['b'])).toBe('b');
  });

  test('matches attention nested inside a plank, including the companion pane itself', () => {
    expect(resolveCompanionAnchor(['a', 'b'], ['a/~assistant'])).toBe('a');
    expect(resolveCompanionAnchor(['a', 'b'], ['a/child'])).toBe('a');
  });

  test('falls back to the last plank when nothing attended is open', () => {
    expect(resolveCompanionAnchor(['a', 'b'], [])).toBe('b');
    expect(resolveCompanionAnchor(['a', 'b'], ['z'])).toBe('b');
  });

  test('prefers the most recently attended plank that is still open', () => {
    expect(resolveCompanionAnchor(['a', 'b'], ['z', 'a'])).toBe('a');
  });

  test('an empty deck has no anchor', () => {
    expect(resolveCompanionAnchor([], ['a'])).toBeUndefined();
  });
});
