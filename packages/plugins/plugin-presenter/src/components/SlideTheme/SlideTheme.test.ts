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
    expect(slideThemeStyle({ name: 'light' }).colorScheme).toBe('light');
    expect(slideThemeStyle({ name: 'dark' }).colorScheme).toBe('dark');
  });

  test('serif changes body and heading fonts only', () => {
    const style = slideThemeStyle({ name: 'serif' });
    expect(style['--slide-font-body']).toMatch(/serif$/);
    expect(style['--slide-font-heading']).toMatch(/serif$/);
    expect(style['--slide-font-mono']).toBe('var(--font-mono)');
  });

  test('valid overrides apply', () => {
    const style = slideThemeStyle({ accent: 'oklch(70% 0.2 30)', background: '#101010', font: "'Inter', sans-serif" });
    expect(style['--slide-accent']).toBe('oklch(70% 0.2 30)');
    expect(style['--slide-bg']).toBe('#101010');
    expect(style['--slide-font-body']).toBe("'Inter', sans-serif");
  });

  test('values that could load resources or escape the declaration are ignored', () => {
    const style = slideThemeStyle({
      accent: 'url(https://example.com/x)',
      background: 'red; background-image: url(x)',
      font: 'x; color: red',
    });
    expect(style['--slide-accent']).toBe('var(--color-accent-text)');
    expect(style['--slide-bg']).toBe('var(--dx-surface-base)');
    expect(style['--slide-font-body']).toBe('var(--font-mono)');
  });
});

describe('SlideTheme.Settings', () => {
  const decode = Schema.decodeUnknownResult(SlideTheme.Settings);

  test('accepts a name with overrides', () => {
    expect(Result.isSuccess(decode({ name: 'dark', accent: '#f80' }))).toBe(true);
  });

  test('accepts only 3-, 4-, 6- and 8-digit hex colors', () => {
    expect(['#abc', '#abcd', '#aabbcc', '#aabbccdd'].every(SlideTheme.isColor)).toBe(true);
    expect(['#ab', '#abcde', '#abcdefa', '#abcdefabc'].some(SlideTheme.isColor)).toBe(false);
  });

  test('rejects unknown names and unsafe values', () => {
    expect(Result.isSuccess(decode({ name: 'neon' }))).toBe(false);
    expect(Result.isSuccess(decode({ background: 'url(x)' }))).toBe(false);
  });
});
