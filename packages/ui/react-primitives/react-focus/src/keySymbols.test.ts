//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SEQUENCE_SYMBOL, keySymbols } from './keySymbols.ts';

describe('keySymbols', () => {
  test('splits a chord into one cap per key', () => {
    expect(keySymbols('shift+meta+k')).toHaveLength(3);
  });

  test('splits a sequence and keeps its boundary', () => {
    // Zag accepts `g > h`. Left whole it renders as one cap reading `G > H`; split without the
    // separator it renders as `GH`, since the command palette joins the caps with no delimiter.
    expect(keySymbols('g > h')).toEqual(['G', SEQUENCE_SYMBOL, 'H']);
    expect(keySymbols('meta+k > p').join('')).toContain(SEQUENCE_SYMBOL);
  });

  test('names the special keys', () => {
    expect(keySymbols('Escape')).toEqual(['\u238B']);
    expect(keySymbols('shift+Enter')).toEqual(['\u21E7', '\u23CE']);
  });

  test('reads control as ctrl', () => {
    expect(keySymbols('control+k')).toEqual(keySymbols('ctrl+k'));
  });
});
