//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { chooseTheme, withThemeChoice } from './theme-choice.ts';

describe('theme choice', () => {
  test('a theme picked here is drawn over the host theme, the default included', ({ expect }) => {
    expect(chooseTheme('paper', undefined)).toBe('paper');
    expect(chooseTheme('paper', { theme: 'soft' })).toBe('soft');
    expect(chooseTheme('paper', { theme: undefined })).toBeUndefined();
  });

  test('an editor display shows a pick here as its override, and the default as the scene theme', ({ expect }) => {
    const display = { theme: 'cad', grid: true, snap: false };
    expect(withThemeChoice(display, undefined)).toBe(display);
    expect(withThemeChoice(display, { theme: 'clay' })).toEqual({ ...display, theme: 'clay', themeOverride: 'clay' });
    expect(withThemeChoice(display, { theme: undefined })).toEqual({ ...display, themeOverride: undefined });
  });
});
