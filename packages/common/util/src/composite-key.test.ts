//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compositeKey, splitCompositeKey } from './composite-key';

describe('compositeKey', () => {
  test('joins parts with colon', ({ expect }) => {
    expect(compositeKey('a', 'b', 'c')).to.eq('a:b:c');
  });

  test('single part returns as-is', ({ expect }) => {
    expect(compositeKey('only')).to.eq('only');
  });

  test('handles empty strings in parts', ({ expect }) => {
    expect(compositeKey('', 'b')).to.eq(':b');
  });
});

describe('splitCompositeKey', () => {
  test('splits on colon', ({ expect }) => {
    expect(splitCompositeKey('a:b:c')).to.deep.eq(['a', 'b', 'c']);
  });

  test('single part returns array of one', ({ expect }) => {
    expect(splitCompositeKey('only')).to.deep.eq(['only']);
  });
});
