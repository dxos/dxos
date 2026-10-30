//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SOFT_PALETTE, SOFT_RELIEF, SOFT_VARS, softVars } from './soft.ts';
import {
  DEFAULT_THEMES,
  SOFT_BACKGROUND,
  SOFT_STYLE_SET,
  defaultThemeRegistry,
  resolveLook,
  styleVariant,
} from './style-set.ts';

describe('soft tokens', () => {
  test('each mode has its own ground, and both are hex so 3D can read them', ({ expect }) => {
    expect(SOFT_PALETTE.light.ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(SOFT_PALETTE.dark.ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(SOFT_PALETTE.light.ground).not.toBe(SOFT_PALETTE.dark.ground);
  });

  test('the variables pair the light and dark colours and compose the relief from them', ({ expect }) => {
    const vars = softVars();
    expect(vars[SOFT_VARS.ground]).toBe(`light-dark(${SOFT_PALETTE.light.ground}, ${SOFT_PALETTE.dark.ground})`);
    // Raised: the light shadow up-left, the dark one down-right.
    const { offset, blur } = SOFT_RELIEF.raised;
    expect(vars[SOFT_VARS.raised]).toBe(
      `-${offset}px -${offset}px ${blur}px var(--dx-soft-highlight), ${offset}px ${offset}px ${blur}px var(--dx-soft-shade)`,
    );
    // Pressed and inset shadows fall inside the shape.
    expect(vars[SOFT_VARS.inset].startsWith('inset ')).toBe(true);
    expect(vars[SOFT_VARS.pressed].startsWith('inset ')).toBe(true);
    // A miniature scales the relief, not the colours.
    expect(softVars(0.5)[SOFT_VARS.raised]).toContain(`${offset / 2}px`);
    expect(softVars(0.5)[SOFT_VARS.ground]).toBe(vars[SOFT_VARS.ground]);
  });
});

describe('soft theme', () => {
  test('follows the app, raises shapes by default and links with grooves', ({ expect }) => {
    expect(DEFAULT_THEMES.soft.mode).toBeUndefined();
    const look = resolveLook(defaultThemeRegistry, { theme: 'soft' });
    expect(look.tone).toBe('theme');
    expect(look.styleSet).toBe(SOFT_STYLE_SET);
    expect(look.background).toBe(SOFT_BACKGROUND);
    expect(styleVariant(SOFT_STYLE_SET, undefined).surface).toBe('soft-raised');
    expect(SOFT_STYLE_SET.variants.map((variant) => variant.surface)).toEqual([
      'soft-flat',
      'soft-inset',
      'soft-raised',
    ]);
    expect(SOFT_STYLE_SET.link.kind).toBe('groove');
    expect(SOFT_BACKGROUND.surface).toBe('soft');
  });
});
