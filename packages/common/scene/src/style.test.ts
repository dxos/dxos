//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { type Style2D, Style2D as Style2DSchema } from './element.ts';
import { Style3D, flattenStyle, liftStyle, resolveStyle, styleRef } from './style.ts';

describe('styles', () => {
  test('resolution order: element overrides, layout, model, catalogs in order, defaults', () => {
    const resolved = resolveStyle<Style2D>(
      { style: 'warn', overrides: { color: 'red' } },
      { styles: { warn: { fill: 'tint' } } },
      { styles: { warn: { fontSize: 12, fill: 'solid' } } },
      [
        { key: 'brand', styles: { warn: { stroke: 'dashed', fontSize: 20 } } },
        { key: 'other', styles: { warn: { stroke: 'dotted', corners: 'all' } } },
      ],
      { warn: { opacity: 0.5, corners: 'none' } },
    );
    expect(resolved).toEqual({
      color: 'red',
      fill: 'tint',
      fontSize: 12,
      stroke: 'dashed',
      corners: 'all',
      opacity: 0.5,
    });
  });

  test('a catalog reference names its catalog', () => {
    const catalogs = [
      { key: 'other', styles: { warning: { color: 'blue' } } },
      { key: 'brand', styles: { warning: { color: 'amber' } } },
    ];
    expect(resolveStyle<Style2D>({ style: styleRef('brand', 'warning') }, {}, { styles: {} }, catalogs, {})).toEqual({
      color: 'amber',
    });
    expect(styleRef('brand', 'warning')).toBe('brand:warning');
  });

  test('an element without a named style takes only its overrides', () => {
    expect(resolveStyle<Style2D>({ overrides: { color: 'green' } }, {}, { styles: {} }, [], {})).toEqual({
      color: 'green',
    });
  });

  test('Style2D and Style3D are distinct schemas', () => {
    const decode2D = Schema.decodeUnknownSync(Style2DSchema, { onExcessProperty: 'error' });
    expect(() => decode2D({ metalness: 0.5 })).toThrow();
    expect(decode2D({ stroke: 'sketchy', fill: 'pattern', weight: 'l', color: 'black' })).toEqual({
      stroke: 'sketchy',
      fill: 'pattern',
      weight: 'l',
      color: 'black',
    });
    expect(Schema.decodeUnknownSync(Style3D)({ metalness: 0.5, fill: 'glass' })).toEqual({
      metalness: 0.5,
      fill: 'glass',
    });
  });

  test('a style crosses dimensions with the fields the two share', () => {
    expect(liftStyle({ color: 'blue/3', fill: 'tint', stroke: 'none', font: 'mono', fontSize: 12 })).toEqual({
      color: 'blue/3',
      fill: 'tint',
      stroke: 'none',
    });
    expect(flattenStyle({ color: 'red', fill: 'glass', corners: 'all', metalness: 1 })).toEqual({
      color: 'red',
      fill: 'glass',
      corners: 'all',
    });
  });
});
