//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { keySymbols } from './keySymbols';

describe('keySymbols', () => {
  test('splits a chord into one cap per key', () => {
    expect(keySymbols('shift+meta+k')).toHaveLength(3);
  });

  test('splits a sequence, so it does not render as a single cap', () => {
    // Zag accepts `g > h`; left whole it would render as one key reading `G > H`.
    expect(keySymbols('g > h')).toEqual(['G', 'H']);
    expect(keySymbols('meta+k > p')).toHaveLength(3);
  });

  test('names the special keys', () => {
    expect(keySymbols('Escape')).toEqual(['⎋']);
    expect(keySymbols('shift+Enter')).toEqual(['⇧', '⏎']);
  });
});
