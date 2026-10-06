//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { getPropertySignatures } from '@dxos/effect/SchemaAST';

import { ClassNode, EllipseNode, LineLink, RectNode } from '../model/types.ts';
import { commonSchema, mergeValues, patchValues } from './properties.ts';

const names = (schema: Schema.Codec<any, any> | undefined) =>
  schema ? getPropertySignatures(schema.ast).map((property) => property.name) : [];

describe('properties', () => {
  test('one schema is its own common schema', ({ expect }) => {
    expect(names(commonSchema([RectNode]))).toEqual(names(RectNode));
  });

  test('common properties are the ones every type declares alike', ({ expect }) => {
    const rectEllipse = names(commonSchema([RectNode, EllipseNode]));
    expect(rectEllipse).toContain('label');
    expect(rectEllipse).toContain('style');
    expect(rectEllipse).not.toContain('type');

    const rectClass = names(commonSchema([RectNode, ClassNode]));
    expect(rectClass).toContain('style');
    expect(rectClass).not.toContain('label');

    // A node and a link share only what both declare: here `locked` (and the hidden `id`/`z`).
    expect(names(commonSchema([RectNode, LineLink]))).toEqual(['id', 'z', 'locked']);
    expect(commonSchema([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.String })])).toBeUndefined();
  });

  test('values merge field by field, mixed where they differ', ({ expect }) => {
    const { values, mixed } = mergeValues(
      [
        { label: 'A', style: { hue: 'red', fill: true }, center: { x: 0, y: 16 } },
        { label: 'A', style: { hue: 'blue', fill: true }, center: { x: 32, y: 16 } },
      ],
      ['label', 'style', 'center'],
    );
    expect(values).toEqual({ label: 'A', style: { hue: 'red', fill: true }, center: { x: 0, y: 16 } });
    expect([...mixed].sort()).toEqual(['center.x', 'style.hue']);
  });

  test('a patch writes only the changed paths and keeps the rest of a nested value', ({ expect }) => {
    const element = { label: 'A', style: { hue: 'red', rounded: true }, center: { x: 0, y: 16 } };
    const values = { label: 'B', style: { hue: 'blue', rounded: false }, center: { x: 48, y: 0 } };
    expect(patchValues(element, values, ['style.hue', 'center.x'])).toEqual({
      style: { hue: 'blue', rounded: true },
      center: { x: 48, y: 16 },
    });
  });
});
