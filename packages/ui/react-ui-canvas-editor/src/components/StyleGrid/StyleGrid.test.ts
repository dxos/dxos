//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { CLASSIC_LOOK, defaultThemeRegistry, resolveLook } from '@dxos/react-ui-canvas';

import { STYLE_FIELD_OVERRIDES, STYLE_FIELDS, StyleGridField, applyStyleChoice, shownHue } from './StyleGrid.tsx';

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

describe('the swatch an unset hue selects', () => {
  test('a Neu shape with no hue selects Neutral, as it draws as Neutral', () => {
    for (const theme of ['neu-light', 'neu-dark']) {
      const look = resolveLook(defaultThemeRegistry, { theme });
      for (const tone of [0, 1, 2] as const) {
        expect(shownHue(undefined, look, tone)).toBe('neutral');
      }
    }
  });

  test('a look whose unset hue draws as none of its hues selects nothing; a set hue is itself', () => {
    expect(shownHue(undefined, CLASSIC_LOOK, 1)).toBeUndefined();
    expect(shownHue('red', CLASSIC_LOOK, 1)).toBe('red');
  });
});
