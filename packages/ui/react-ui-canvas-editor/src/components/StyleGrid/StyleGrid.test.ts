//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { CLASSIC_LOOK, defaultThemeRegistry, resolveLook } from '@dxos/react-ui-canvas';

import {
  STYLE_FIELD_OVERRIDES,
  STYLE_FIELDS,
  StyleGridField,
  applyStyleChoice,
  pickedColor,
  shownHue,
} from './StyleGrid.tsx';

describe('style fields', () => {
  test('a pick with fills sets the hue and its tone together, keeping the rest of the style', () => {
    expect(applyStyleChoice({ fill: 'glass', stroke: 'solid' }, { hue: 'red', tone: 1 }, true)).toEqual({
      fill: 'glass',
      stroke: 'solid',
      color: 'red/1',
    });
    expect(pickedColor('blue/3', { hue: 'red', tone: 1 }, true)).toBe('red/1');
  });

  test('an outline pick sets the hue alone', () => {
    expect(applyStyleChoice({ color: 'default/3' }, { hue: 'blue', tone: 0 }, false)).toEqual({ color: 'blue/3' });
    expect(pickedColor('red/3', { hue: 'blue', tone: 0 }, false)).toBe('blue/3');
    // A colour with no tone, a link's, takes the hue and still states none.
    expect(pickedColor(undefined, { hue: 'blue', tone: 0 }, false)).toBe('blue');
    expect(pickedColor('red', { hue: 'blue', tone: 0 }, false)).toBe('blue');
  });

  test('every scene view takes the same style fields: the grid at overrides.color, under the Style heading', () => {
    expect(STYLE_FIELDS['overrides.color']).toBe(StyleGridField);
    expect(STYLE_FIELD_OVERRIDES['overrides.color']).toMatchObject({ hideLabel: true });
    expect(STYLE_FIELD_OVERRIDES.overrides).toMatchObject({ label: 'Style' });
  });

  test('a pick replaces a literal colour, which has no tone to keep', () => {
    expect(pickedColor('#1e90ff', { hue: 'green', tone: 2 }, true)).toBe('green/2');
    expect(pickedColor('#1e90ff', { hue: 'green', tone: 0 }, false)).toBe('green');
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
