//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { SlideTheme } from '#types';

import { slideThemeStyle } from './SlideTheme.tsx';

describe('slideThemeStyle', () => {
  test('default theme follows the app mode', () => {
    const style = slideThemeStyle();
    expect(style.colorScheme).toBeUndefined();
    expect(style['--slide-accent']).toBe('var(--color-accent-text)');
  });

  test('light and dark force a color scheme', () => {
    expect(slideThemeStyle({ base: 'light' }).colorScheme).toBe('light');
    expect(slideThemeStyle({ base: 'dark' }).colorScheme).toBe('dark');
  });

  test('serif changes body and heading fonts only', () => {
    const style = slideThemeStyle({ base: 'serif' });
    expect(style['--slide-font-body']).toMatch(/serif$/);
    expect(style['--slide-font-heading']).toMatch(/serif$/);
    expect(style['--slide-font-mono']).toBe('var(--font-mono)');
  });

  test('valid overrides apply', () => {
    const style = slideThemeStyle({ accent: 'oklch(70% 0.2 30)', background: '#101010', font: 'serif' });
    expect(style['--slide-accent']).toBe('oklch(70% 0.2 30)');
    expect(style['--slide-bg']).toBe('#101010');
    expect(style['--slide-font-body']).toMatch(/serif$/);
    expect(style['--slide-font-heading']).toMatch(/serif$/);
  });

  test('the text and code fonts are picked separately', () => {
    const style = slideThemeStyle({ base: 'serif', font: 'sans', monoFont: 'fira' });
    expect(style['--slide-font-body']).toContain('Inter');
    expect(style['--slide-font-heading']).toContain('Inter');
    expect(style['--slide-font-mono']).toContain('Fira Code');
  });

  test('values that could load resources or escape the declaration are ignored', () => {
    const style = slideThemeStyle({
      accent: 'url(https://example.com/x)',
      background: 'red; background-image: url(x)',
    });
    expect(style['--slide-accent']).toBe('var(--color-accent-text)');
    expect(style['--slide-bg']).toBe('var(--dx-surface-base)');
  });
});

describe('SlideTheme.Settings', () => {
  const decode = Schema.decodeUnknownResult(SlideTheme.Settings);

  test('accepts a base theme with overrides', () => {
    expect(Result.isSuccess(decode({ base: 'dark', accent: '#f80' }))).toBe(true);
  });

  test('accepts only the named fonts', () => {
    expect(Result.isSuccess(decode({ font: 'serif', monoFont: 'plex' }))).toBe(true);
    expect(Result.isSuccess(decode({ font: "'Inter', sans-serif" }))).toBe(false);
    expect(Result.isSuccess(decode({ monoFont: 'x; color: red' }))).toBe(false);
  });

  test('accepts only 3-, 4-, 6- and 8-digit hex colors', () => {
    expect(['#abc', '#abcd', '#aabbcc', '#aabbccdd'].every(SlideTheme.isColor)).toBe(true);
    expect(['#ab', '#abcde', '#abcdefa', '#abcdefabc'].some(SlideTheme.isColor)).toBe(false);
  });

  test('the code and separator colors are overridable too', () => {
    expect(Result.isSuccess(decode({ code: '#111', separator: '#222' }))).toBe(true);
    const style = slideThemeStyle({ code: '#111', separator: '#222' });
    expect(style['--slide-code']).toBe('#111');
    expect(style['--slide-separator']).toBe('#222');
  });

  test('rejects unknown base themes and unsafe values', () => {
    expect(Result.isSuccess(decode({ base: 'neon' }))).toBe(false);
    expect(Result.isSuccess(decode({ background: 'url(x)' }))).toBe(false);
  });

  test('a bare word is a color only where CSS knows it', () => {
    expect(['rebeccapurple', 'transparent', 'currentColor'].every(SlideTheme.isColor)).toBe(true);
    expect(['notacolor', 'rgb()', 'oklch( )'].some(SlideTheme.isColor)).toBe(false);
  });

  test('a color function needs its three components, in either syntax', () => {
    expect(
      ['rgb(1 2 3)', 'rgb(1,2,3)', 'rgba(1,2,3,0.5)', 'rgb(1 2 3 / 50%)', 'oklch(44.3% 0.11 240.79)'].every(
        SlideTheme.isColor,
      ),
    ).toBe(true);
    expect(['rgb(1)', 'rgb(+)', 'rgb(1 2)', 'rgb(1 2 3 4 5)'].some(SlideTheme.isColor)).toBe(false);
  });

  test('the theme accent is published separately, for a tone to return to', () => {
    expect(slideThemeStyle({ accent: '#f80' })['--slide-theme-accent']).toBe('#f80');
  });
});
