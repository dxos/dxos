//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { materialSpec, themeMode3D, toTheme3D } from './style.ts';

describe('materialSpec', () => {
  test('glass is a rim shell in the presentation look', () => {
    expect(materialSpec({ fill: 'glass', color: 'blue' }, 'presentation')).toMatchObject({
      kind: 'rim',
      color: '#3366cc',
    });
  });

  test('glass is a see-through standard material in the CAD look', () => {
    const spec = materialSpec({ fill: 'glass' }, 'cad');
    expect(spec.kind).toBe('standard');
    expect(spec.alpha).toBeLessThan(1);
  });

  test('Neu Light and Neu Dark draw alike, each held in its mode; the other looks follow the app', () => {
    expect(materialSpec({ color: 'blue' }, 'neu-light')).toEqual(materialSpec({ color: 'blue' }, 'neu-dark'));
    expect(themeMode3D('neu-light', 'dark')).toBe('light');
    expect(themeMode3D('neu-dark', 'light')).toBe('dark');
    expect(themeMode3D('cad', 'light')).toBe('light');
    expect(themeMode3D('presentation', 'dark')).toBe('dark');
  });

  test('Neu is a matte body whose hue is its edge accent, edged whatever the stroke', () => {
    expect(materialSpec({ color: 'blue' }, 'neu-dark')).toEqual({
      color: '#3366cc',
      kind: 'neu',
      alpha: 1,
      edges: true,
    });
    expect(materialSpec({ fill: 'glass', stroke: 'none' }, 'neu-dark')).toMatchObject({ kind: 'neu', edges: true });
    expect(materialSpec({ fill: 'glass' }, 'neu-dark').alpha).toBeLessThan(1);
  });

  test('a stored look id resolves, a renamed look by its new id', () => {
    expect(toTheme3D('presentation')).toBe('presentation');
    expect(toTheme3D('neu-light')).toBe('neu-light');
    expect(toTheme3D('clay')).toBe('neu-dark');
    expect(toTheme3D('clay-light')).toBe('neu-light');
    expect(toTheme3D('unknown')).toBeUndefined();
    expect(toTheme3D(undefined)).toBeUndefined();
  });

  test('a stroke draws edges and opacity scales alpha', () => {
    expect(materialSpec({ stroke: 'solid', opacity: 0.5 }, 'cad')).toMatchObject({ edges: true, alpha: 0.5 });
    expect(materialSpec({ stroke: 'none' }, 'cad').edges).toBe(false);
    expect(materialSpec({}, 'cad').edges).toBe(false);
  });

  test('a colour is a theme name at any tone, a named colour of the default theme, or a literal', () => {
    expect(materialSpec({ color: 'blue/1' }, 'cad').color).toBe('#3366cc');
    expect(materialSpec({ color: 'light-blue' }, 'cad').color).toBe(materialSpec({ color: 'sky' }, 'cad').color);
    expect(materialSpec({ color: 'default/2' }, 'cad').color).toBe(materialSpec({}, 'cad').color);
    expect(materialSpec({ color: '#1e90ff' }, 'cad').color).toBe('#1e90ff');
    expect(materialSpec({ color: '#f80' }, 'cad').color).toBe('#ff8800');
    expect(materialSpec({ color: 'rgb(30 144 255)' }, 'cad').color).toBe('#1e90ff');
  });

  test('a pattern has no material and draws solid; a tint is see-through', () => {
    expect(materialSpec({ fill: 'pattern' }, 'cad').alpha).toBe(1);
    expect(materialSpec({ fill: 'tint' }, 'cad').alpha).toBeLessThan(1);
  });
});

describe('Neu without a colour', () => {
  test('a Neu body with no colour draws exactly as Neutral', () => {
    for (const theme of ['neu-light', 'neu-dark'] as const) {
      expect(materialSpec({}, theme)).toEqual(materialSpec({ color: 'neutral' }, theme));
      expect(materialSpec(undefined, theme)).toEqual(materialSpec({ color: 'neutral' }, theme));
    }
  });
});
