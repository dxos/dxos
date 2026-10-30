//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { materialSpec, themeMode3D } from './style.ts';

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

  test('Clay Light draws as Clay, held light; the other looks follow the app', () => {
    expect(materialSpec({ hue: 'blue' }, 'clay-light')).toEqual(materialSpec({ hue: 'blue' }, 'clay'));
    expect(themeMode3D('clay-light', 'dark')).toBe('light');
    expect(themeMode3D('clay', 'dark')).toBe('dark');
    expect(themeMode3D('cad', 'light')).toBe('light');
  });

  test('clay is a matte body whose hue is its edge accent, edged whatever the border', () => {
    expect(materialSpec({ hue: 'blue' }, 'clay')).toEqual({ color: '#3366cc', kind: 'clay', alpha: 1, edges: true });
    expect(materialSpec({ surface: 'glass', border: false }, 'clay')).toMatchObject({ kind: 'clay', edges: true });
    expect(materialSpec({ surface: 'glass' }, 'clay').alpha).toBeLessThan(1);
  });

  test('a border draws edges and opacity scales alpha', () => {
    expect(materialSpec({ border: true, opacity: 0.5 }, 'cad')).toMatchObject({ edges: true, alpha: 0.5 });
  });
});
