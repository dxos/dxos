//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { NEU_PALETTE, NEU_RELIEF, NEU_VARS, neuVars } from './neu.ts';
import {
  DEFAULT_THEMES,
  NEU_BACKGROUND,
  NEU_DARK_THEME,
  NEU_LIGHT_THEME,
  NEU_STYLE_SET,
  THEME_IDS,
  createThemeRegistry,
  currentLookId,
  defaultThemeRegistry,
  resolveLook,
  styleVariant,
} from './style-set.ts';

describe('neu tokens', () => {
  test('each mode has its own ground, and both are hex so 3D can read them', ({ expect }) => {
    expect(NEU_PALETTE.light.ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(NEU_PALETTE.dark.ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(NEU_PALETTE.light.ground).not.toBe(NEU_PALETTE.dark.ground);
  });

  test('the variables pair the light and dark colours and compose the relief from them', ({ expect }) => {
    const vars = neuVars();
    expect(vars[NEU_VARS.ground]).toBe(`light-dark(${NEU_PALETTE.light.ground}, ${NEU_PALETTE.dark.ground})`);
    // Raised: the light shadow up-left, the dark one down-right.
    const { offset, blur } = NEU_RELIEF.raised;
    expect(vars[NEU_VARS.raised]).toBe(
      `-${offset}px -${offset}px ${blur}px var(--dx-neu-highlight), ${offset}px ${offset}px ${blur}px var(--dx-neu-shade)`,
    );
    // Inset shadows fall inside the shape.
    expect(vars[NEU_VARS.inset].startsWith('inset ')).toBe(true);
    // A miniature scales the relief, not the colours.
    expect(neuVars(0.5)[NEU_VARS.raised]).toContain(`${offset / 2}px`);
    expect(neuVars(0.5)[NEU_VARS.ground]).toBe(vars[NEU_VARS.ground]);
  });
});

describe('neu themes', () => {
  test('Neu Light and Neu Dark are one look, each held in its mode, raising shapes and linking with grooves', ({
    expect,
  }) => {
    expect(THEME_IDS.filter((id) => id.startsWith('neu-'))).toEqual(['neu-light', 'neu-dark']);
    expect(DEFAULT_THEMES['neu-light']).toBe(NEU_LIGHT_THEME);
    expect(DEFAULT_THEMES['neu-dark']).toBe(NEU_DARK_THEME);
    for (const [theme, tone] of [
      ['neu-light', 'light'],
      ['neu-dark', 'dark'],
    ] as const) {
      const look = resolveLook(defaultThemeRegistry, { theme });
      expect(look.tone).toBe(tone);
      expect(look.styleSet).toBe(NEU_STYLE_SET);
      expect(look.background).toBe(NEU_BACKGROUND);
    }
    expect(styleVariant(NEU_STYLE_SET, undefined).surface).toBe('neu-raised');
    // Tone is height out of the ground: cut in, level, standing out.
    expect(NEU_STYLE_SET.variants.map((variant) => variant.surface)).toEqual(['neu-inset', 'neu-flat', 'neu-raised']);
    expect(NEU_STYLE_SET.link.kind).toBe('groove');
    expect(NEU_BACKGROUND.surface).toBe('neu');
  });

  test('a theme, style set or background stored under its old id resolves to the renamed one', ({ expect }) => {
    expect(currentLookId('themes', 'soft')).toBe('neu-dark');
    expect(currentLookId('themes', 'soft-light')).toBe('neu-light');
    expect(currentLookId('themes', 'paper')).toBe('paper');
    expect(currentLookId('styleSets', 'soft')).toBe('neu');
    expect(currentLookId('backgrounds', 'soft')).toBe('neu');
    expect(currentLookId('themes', undefined)).toBeUndefined();
    expect(resolveLook(defaultThemeRegistry, { theme: 'soft' }).theme).toBe(NEU_DARK_THEME);
    expect(resolveLook(defaultThemeRegistry, { theme: 'soft-light' }).theme).toBe(NEU_LIGHT_THEME);
    const overridden = resolveLook(defaultThemeRegistry, { theme: 'flat', styleSet: 'soft', background: 'soft' });
    expect(overridden.styleSet).toBe(NEU_STYLE_SET);
    expect(overridden.background).toBe(NEU_BACKGROUND);
  });

  test('a registry entry under an old id wins over the rename', ({ expect }) => {
    const custom = { id: 'soft', name: 'Custom', styleSet: 'flat', background: 'dots' };
    const registry = createThemeRegistry({ themes: { soft: custom } });
    expect(resolveLook(registry, { theme: 'soft' }).theme).toBe(custom);
  });
});
