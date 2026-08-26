//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { escapeXml, wrapText } from './text';

describe('escapeXml', () => {
  test('escapes every XML metacharacter', ({ expect }) => {
    expect(escapeXml('Tom & "Jerry" <3 \'x\'')).toBe('Tom &amp; &quot;Jerry&quot; &lt;3 &apos;x&apos;');
  });
});

describe('wrapText', () => {
  test('keeps a short label on one line', ({ expect }) => {
    expect(wrapText('Notes', 11, 2)).toEqual(['Notes']);
  });

  test('wraps onto the second line', ({ expect }) => {
    expect(wrapText('Weekly team notes', 11, 2)).toEqual(['Weekly team', 'notes']);
  });

  test('ellipsises past the last line', ({ expect }) => {
    const lines = wrapText('Weekly team notes and other things', 11, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });

  test('hard-splits a word longer than the budget', ({ expect }) => {
    expect(wrapText('Unmaintainability', 11, 1)).toEqual(['Unmaintain…']);
  });

  test('returns nothing for a blank label', ({ expect }) => {
    expect(wrapText('   ', 11, 2)).toEqual([]);
  });
});
