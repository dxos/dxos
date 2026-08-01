//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buildSnippet, computeMatchSpans } from './match';

describe('computeMatchSpans', () => {
  test('finds case-insensitive occurrences', () => {
    expect(computeMatchSpans('Acme Invoice', 'invoice')).toEqual([{ start: 5, end: 12 }]);
    expect(computeMatchSpans('no match here', 'xyz')).toEqual([]);
  });
});

describe('buildSnippet', () => {
  test('returns text unchanged when it fits within maxLength and has no match', () => {
    expect(buildSnippet('Acme Invoice', 'xyz')).toBe('Acme Invoice');
  });

  test('falls back to the head of text with a trailing ellipsis when there is no match', () => {
    const text = 'a'.repeat(200);
    const snippet = buildSnippet(text, 'xyz', { maxLength: 160 });
    expect(snippet).toBe(`${'a'.repeat(160)}…`);
  });

  test('falls back to the head of text when the query is empty', () => {
    const text = 'a'.repeat(200);
    expect(buildSnippet(text, '', { maxLength: 160 })).toBe(`${'a'.repeat(160)}…`);
    expect(buildSnippet(text, '   ', { maxLength: 160 })).toBe(`${'a'.repeat(160)}…`);
  });

  test('centres a window on the first match, with ellipses on both sides', () => {
    const text = `${'x'.repeat(100)}TARGET${'y'.repeat(100)}`;
    const snippet = buildSnippet(text, 'target', { maxLength: 40 });
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('TARGET');
    // The window is centred: roughly as much context before as after the match.
    const inner = snippet.slice(1, -1);
    const matchIndex = inner.indexOf('TARGET');
    const before = matchIndex;
    const after = inner.length - matchIndex - 'TARGET'.length;
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });

  test('omits the leading ellipsis when the match window starts at the beginning of the text', () => {
    const text = `TARGET${'y'.repeat(200)}`;
    const snippet = buildSnippet(text, 'target', { maxLength: 40 });
    expect(snippet.startsWith('…')).toBe(false);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('TARGET');
  });

  test('omits the trailing ellipsis when the match window reaches the end of the text', () => {
    const text = `${'y'.repeat(200)}TARGET`;
    const snippet = buildSnippet(text, 'target', { maxLength: 40 });
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(false);
    expect(snippet).toContain('TARGET');
  });

  test('does not split the matched term even when it is longer than maxLength', () => {
    const longMatch = 'X'.repeat(50);
    const text = `${'a'.repeat(100)}${longMatch}${'b'.repeat(100)}`;
    const snippet = buildSnippet(text, longMatch, { maxLength: 20 });
    expect(snippet).toContain(longMatch);
  });

  test('normalizes whitespace before building the snippet', () => {
    const text = '  Acme    Invoice  \n  for   services  ';
    expect(buildSnippet(text, 'xyz', { maxLength: 160 })).toBe('Acme Invoice for services');
  });
});
