//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { STYLE_FIELD_OVERRIDES, STYLE_FIELDS, StyleGridField, applyStyleChoice } from './StyleGrid.tsx';

describe('style fields', () => {
  test('a pick with fills sets the hue and its tone together, keeping the rest of the style', () => {
    expect(applyStyleChoice({ surface: 'glass', border: true }, { hue: 'red', tone: 1 }, true)).toEqual({
      surface: 'glass',
      border: true,
      hue: 'red',
      tone: 1,
    });
  });

  test('an outline pick sets the hue alone', () => {
    expect(applyStyleChoice({ tone: 3 }, { hue: 'blue', tone: 0 }, false)).toEqual({ tone: 3, hue: 'blue' });
  });

  test('every scene view takes the same style fields: the grid at style.hue, its tone hidden', () => {
    expect(STYLE_FIELDS['style.hue']).toBe(StyleGridField);
    expect(STYLE_FIELD_OVERRIDES['style.tone']).toMatchObject({ hidden: true });
  });
});
