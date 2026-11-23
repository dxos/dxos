//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { type Style2D, Style2D as Style2DSchema, Style3D, resolveStyle, styleRef } from './style.ts';

describe('styles', () => {
  test('resolution order: element overrides, layout, model, catalogs in order, defaults', () => {
    const resolved = resolveStyle<Style2D>(
      { style: 'warn', overrides: { hue: 'red' } },
      { styles: { warn: { tone: 1 } } },
      { styles: { warn: { fontSize: 12, tone: 3 } } },
      [
        { key: 'brand', styles: { warn: { lineStyle: 'dashed', fontSize: 20 } } },
        { key: 'other', styles: { warn: { lineStyle: 'dotted', border: true } } },
      ],
      { warn: { opacity: 0.5, border: false } },
    );
    expect(resolved).toEqual({ hue: 'red', tone: 1, fontSize: 12, lineStyle: 'dashed', border: true, opacity: 0.5 });
  });

  test('a catalog reference names its catalog', () => {
    const catalogs = [
      { key: 'other', styles: { warning: { hue: 'blue' } } },
      { key: 'brand', styles: { warning: { hue: 'amber' } } },
    ];
    expect(resolveStyle<Style2D>({ style: styleRef('brand', 'warning') }, {}, { styles: {} }, catalogs, {})).toEqual({
      hue: 'amber',
    });
    expect(styleRef('brand', 'warning')).toBe('brand:warning');
  });

  test('an element without a named style takes only its overrides', () => {
    expect(resolveStyle<Style2D>({ overrides: { hue: 'green' } }, {}, { styles: {} }, [], {})).toEqual({
      hue: 'green',
    });
  });

  test('Style2D and Style3D are distinct schemas', () => {
    const decode2D = Schema.decodeUnknownSync(Style2DSchema, { onExcessProperty: 'error' });
    expect(() => decode2D({ metalness: 0.5 })).toThrow();
    expect(decode2D({ lineStyle: 'sketchy', pattern: true, weight: 'l', hue: 'black' })).toEqual({
      lineStyle: 'sketchy',
      pattern: true,
      weight: 'l',
      hue: 'black',
    });
    expect(Schema.decodeUnknownSync(Style3D)({ metalness: 0.5, surface: 'glass' })).toEqual({
      metalness: 0.5,
      surface: 'glass',
    });
  });
});
