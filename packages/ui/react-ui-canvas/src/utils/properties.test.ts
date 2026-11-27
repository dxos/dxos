//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { getPropertySignatures } from '@dxos/effect/SchemaAST';
import { EllipseNode, Link, NoteNode, RectNode } from '@dxos/scene';

import { commonSchema, mergeValues, patchValues } from './properties.ts';

const names = (schema: Schema.Codec<any, any> | undefined) =>
  schema ? getPropertySignatures(schema.ast).map((property) => property.name) : [];

describe('properties', () => {
  test('one schema is its own common schema', ({ expect }) => {
    expect(names(commonSchema([RectNode]))).toEqual(names(RectNode));
  });

  test('common properties are the ones every kind declares alike', ({ expect }) => {
    const rectEllipse = names(commonSchema([RectNode, EllipseNode]));
    expect(rectEllipse).toContain('label');
    expect(rectEllipse).toContain('style');
    expect(rectEllipse).toContain('overrides');
    expect(rectEllipse).not.toContain('kind');

    const rectNote = names(commonSchema([RectNode, NoteNode]));
    expect(rectNote).toContain('style');
    expect(rectNote).toContain('overrides');
    // A note's text is its label, which it requires, so it is not the optional label a box has.
    expect(rectNote).not.toContain('label');

    // A node and a link share only what both declare: `locked`, `layer`, `style`, `overrides`, `constrain` — a part
    // of a composite is either one — and `label` (and the hidden `id`/`z`), the look narrowed to the common base both
    // extend.
    const shared = commonSchema([RectNode, Link]);
    expect(names(shared)).toEqual(['id', 'z', 'locked', 'layer', 'style', 'overrides', 'constrain', 'label']);
    const look = shared && getPropertySignatures(shared.ast).find((property) => property.name === 'overrides');
    const struct = look?.type._tag === 'Union' ? look.type.types.find((type) => type._tag === 'Objects') : undefined;
    expect(struct?._tag === 'Objects' && struct.propertySignatures.map((property) => property.name)).toEqual([
      'color',
      'stroke',
      'fontSize',
    ]);
    expect(commonSchema([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.String })])).toBeUndefined();
  });

  test('a field bounded differently by two schemas is not shared', ({ expect }) => {
    const bounded = (minimum: number) =>
      Schema.Struct({ n: Schema.Number.check(Schema.isGreaterThanOrEqualTo(minimum)), s: Schema.String });
    expect(names(commonSchema([bounded(0), bounded(10)]))).toEqual(['s']);
    expect(names(commonSchema([bounded(0), bounded(0)]))).toEqual(['n', 's']);
  });

  test('values merge field by field, mixed where they differ', ({ expect }) => {
    const { values, mixed } = mergeValues(
      [
        { label: 'A', overrides: { color: 'red', fill: 'solid' }, center: { x: 0, y: 16 } },
        { label: 'A', overrides: { color: 'blue', fill: 'solid' }, center: { x: 32, y: 16 } },
      ],
      ['label', 'overrides', 'center'],
    );
    expect(values).toEqual({ label: 'A', overrides: { color: 'red', fill: 'solid' }, center: { x: 0, y: 16 } });
    expect([...mixed].sort()).toEqual(['center.x', 'overrides.color']);
  });

  test('an instance value (a reference) is kept whole, not merged field by field', ({ expect }) => {
    class Reference {
      constructor(readonly uri: string) {}
    }
    const reference = new Reference('echo://space/object');
    const { values } = mergeValues([{ drawing: reference }], ['drawing']);
    expect(values.drawing).toBe(reference);
  });

  test('a patch writes only the changed paths and keeps the rest of a nested value', ({ expect }) => {
    const element = { label: 'A', overrides: { color: 'red', corners: 'all' }, center: { x: 0, y: 16 } };
    const values = { label: 'B', overrides: { color: 'blue', corners: 'none' }, center: { x: 48, y: 0 } };
    expect(patchValues(element, values, ['overrides.color', 'center.x'])).toEqual({
      overrides: { color: 'blue', corners: 'all' },
      center: { x: 48, y: 16 },
    });
  });
});
