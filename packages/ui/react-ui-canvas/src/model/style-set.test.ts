//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { resolveColor, resolveFont } from '@dxos/scene';

import {
  Background,
  CLASSIC_STYLE_SET,
  DEFAULT_BACKGROUNDS,
  DEFAULT_STYLE_SETS,
  DEFAULT_THEMES,
  FLAT_THEME,
  GLASS_STYLE_SET,
  OUTLINE_STYLE_SET,
  PAPER_BACKGROUND,
  PLAIN_BACKGROUND,
  StyleSet,
  Theme,
  createThemeRegistry,
  defaultThemeRegistry,
  resolveBackground,
  resolveLook,
  resolveStyleSet,
  resolveTheme,
  styleVariant,
} from './style-set.ts';

describe('themes', () => {
  test('every built-in decodes against its schema', ({ expect }) => {
    for (const styleSet of Object.values(DEFAULT_STYLE_SETS)) {
      expect(Schema.decodeUnknownSync(StyleSet)(styleSet)).toEqual(styleSet);
    }
    for (const background of Object.values(DEFAULT_BACKGROUNDS)) {
      expect(Schema.decodeUnknownSync(Background)(background)).toEqual(background);
    }
    for (const theme of Object.values(DEFAULT_THEMES)) {
      expect(Schema.decodeUnknownSync(Theme)(theme)).toEqual(theme);
      // Every built-in theme names parts the registry holds.
      expect(defaultThemeRegistry.styleSets[theme.styleSet]).toBeDefined();
      expect(defaultThemeRegistry.backgrounds[theme.background]).toBeDefined();
    }
  });

  test('a malformed set does not decode', ({ expect }) => {
    expect(() =>
      Schema.decodeUnknownSync(StyleSet)({
        ...CLASSIC_STYLE_SET,
        link: { kind: 'zigzag', width: 2, caption: 'opaque' },
      }),
    ).toThrow();
    // A set holds two to four variants.
    expect(() =>
      Schema.decodeUnknownSync(StyleSet)({ ...CLASSIC_STYLE_SET, variants: CLASSIC_STYLE_SET.variants.slice(0, 1) }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(Background)({ ...PLAIN_BACKGROUND, grain: 2 })).toThrow();
  });

  test('ids resolve, and an unknown one falls back to flat', ({ expect }) => {
    expect(resolveTheme(defaultThemeRegistry, 'paper').styleSet).toBe('glass');
    expect(resolveTheme(defaultThemeRegistry, 'gone')).toBe(FLAT_THEME);
    expect(resolveTheme(defaultThemeRegistry, undefined)).toBe(FLAT_THEME);
    expect(resolveStyleSet(defaultThemeRegistry, 'gone')).toBe(DEFAULT_STYLE_SETS.flat);
    expect(resolveBackground(defaultThemeRegistry, 'gone')).toBe(PLAIN_BACKGROUND);
  });

  test("a theme's parts apply unless overridden, and its mode picks the tone", ({ expect }) => {
    const paper = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    expect(paper.styleSet).toBe(GLASS_STYLE_SET);
    expect(paper.background).toBe(PAPER_BACKGROUND);
    expect(paper.tone).toBe('light');
    expect(resolveLook(defaultThemeRegistry, {}).tone).toBe('theme');
    const overridden = resolveLook(defaultThemeRegistry, { theme: 'paper', styleSet: 'flat', background: 'gone' });
    expect(overridden.styleSet.id).toBe('flat');
    // An unknown override leaves the theme's own part.
    expect(overridden.background).toBe(PAPER_BACKGROUND);
  });

  test("a node's tone picks the set's variant", ({ expect }) => {
    expect(styleVariant(CLASSIC_STYLE_SET, undefined).id).toBe('medium');
    expect(styleVariant(CLASSIC_STYLE_SET, 0).id).toBe('outline');
    expect(styleVariant(GLASS_STYLE_SET, undefined).id).toBe('frost');
    expect(styleVariant(DEFAULT_STYLE_SETS.flat, undefined).id).toBe('muted');
    expect(styleVariant(DEFAULT_STYLE_SETS.flat, 0).id).toBe('clear');
    expect(styleVariant(DEFAULT_STYLE_SETS.flat, 3).id).toBe('solid');
    // Past the set's last variant, the last.
    expect(styleVariant(OUTLINE_STYLE_SET, 3).id).toBe('dashed');
  });

  test("a host's themes extend the built-ins and override one of the same id", ({ expect }) => {
    const mine: Theme = { id: 'mine', name: 'Mine', styleSet: 'flat', background: 'paper', mode: 'light' };
    const registry = createThemeRegistry({
      themes: { mine },
      backgrounds: { plain: { ...PLAIN_BACKGROUND, name: 'Bare' } },
    });
    expect(resolveTheme(registry, 'mine')).toBe(mine);
    // Classic is gone; its id falls back to flat.
    expect(registry.themes.classic).toBeUndefined();
    expect(resolveTheme(registry, 'classic')).toBe(FLAT_THEME);
    expect(resolveBackground(registry, 'plain').name).toBe('Bare');
    // A name inherited from `Object.prototype` is no theme.
    expect(resolveTheme(registry, 'toString')).toBe(FLAT_THEME);
  });

  test("a theme's slots name the colours and faces a drawing draws with; a built-in defines none", ({ expect }) => {
    const brand: Theme = {
      id: 'brand',
      name: 'Brand',
      styleSet: 'flat',
      background: 'plain',
      colors: { accent: 'teal/1', ink: '#1e90ff' },
      fonts: { mono: 'Berkeley Mono, monospace' },
    };
    expect(Schema.is(Theme)(brand)).toBe(true);
    expect(Schema.is(Theme)({ ...brand, colors: { accent: 'Not A Colour' } })).toBe(false);
    const look = resolveLook(createThemeRegistry({ themes: { brand } }), { theme: 'brand' });
    expect(resolveColor('accent', look.theme)).toEqual({ kind: 'name', name: 'teal', tone: 1 });
    expect(resolveColor('ink', look.theme)).toEqual({ kind: 'css', css: '#1e90ff' });
    expect(resolveFont('mono', look.theme)).toBe('Berkeley Mono, monospace');
    // A slot the theme leaves out is the default theme's.
    expect(resolveColor('grey', look.theme)).toEqual({ kind: 'name', name: 'neutral' });
    for (const theme of Object.values(DEFAULT_THEMES)) {
      expect([theme.colors, theme.fonts]).toEqual([undefined, undefined]);
    }
  });

  test("a variant's border is a dash, never no line at all", ({ expect }) => {
    const [variant] = CLASSIC_STYLE_SET.variants;
    expect(
      Schema.is(StyleSet)({ ...CLASSIC_STYLE_SET, variants: [{ ...variant, borderStyle: 'dotted' }, variant] }),
    ).toBe(true);
    expect(
      Schema.is(StyleSet)({ ...CLASSIC_STYLE_SET, variants: [{ ...variant, borderStyle: 'none' }, variant] }),
    ).toBe(false);
  });
});
