//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { materialSpec, themeMode3D, toTheme3D } from './style.ts';

describe('materialSpec', () => {
  test('glass is a rim shell in the presentation look', () => {
    expect(materialSpec({ surface: 'glass', hue: 'blue' }, 'presentation')).toMatchObject({
      kind: 'rim',
      color: '#3366cc',
    });
  });

  test('glass is a see-through standard material in the CAD look', () => {
    const spec = materialSpec({ surface: 'glass' }, 'cad');
    expect(spec.kind).toBe('standard');
    expect(spec.alpha).toBeLessThan(1);
  });

  test('Neu Light and Neu Dark draw alike, each held in its mode; the other looks follow the app', () => {
    expect(materialSpec({ hue: 'blue' }, 'neu-light')).toEqual(materialSpec({ hue: 'blue' }, 'neu-dark'));
    expect(themeMode3D('neu-light', 'dark')).toBe('light');
    expect(themeMode3D('neu-dark', 'light')).toBe('dark');
    expect(themeMode3D('cad', 'light')).toBe('light');
    expect(themeMode3D('presentation', 'dark')).toBe('dark');
  });

  test('Neu is a matte body whose hue is its edge accent, edged whatever the border', () => {
    expect(materialSpec({ hue: 'blue' }, 'neu-dark')).toEqual({ color: '#3366cc', kind: 'neu', alpha: 1, edges: true });
    expect(materialSpec({ surface: 'glass', border: false }, 'neu-dark')).toMatchObject({ kind: 'neu', edges: true });
    expect(materialSpec({ surface: 'glass' }, 'neu-dark').alpha).toBeLessThan(1);
  });

  test('a stored look id resolves, a renamed look by its new id', () => {
    expect(toTheme3D('presentation')).toBe('presentation');
    expect(toTheme3D('neu-light')).toBe('neu-light');
    expect(toTheme3D('clay')).toBe('neu-dark');
    expect(toTheme3D('clay-light')).toBe('neu-light');
    expect(toTheme3D('unknown')).toBeUndefined();
    expect(toTheme3D(undefined)).toBeUndefined();
  });

  test('a border draws edges and opacity scales alpha', () => {
    expect(materialSpec({ border: true, opacity: 0.5 }, 'cad')).toMatchObject({ edges: true, alpha: 0.5 });
  });
});
