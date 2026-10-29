//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { materialSpec } from './style.ts';

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

  test('a border draws edges and opacity scales alpha', () => {
    expect(materialSpec({ border: true, opacity: 0.5 }, 'cad')).toMatchObject({ edges: true, alpha: 0.5 });
  });
});
