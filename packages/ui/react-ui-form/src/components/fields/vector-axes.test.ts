//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { VectorAnnotationId } from '@dxos/ui-types';

import { VectorAnnotation } from '../../annotations.ts';
import { getVectorAxes, isVectorType } from './vector-axes.ts';

const Vec3 = Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number }).annotate({
  [VectorAnnotationId]: true,
});

describe('VectorAnnotation', () => {
  test('a model schema marks a vector by the id alone', ({ expect }) => {
    expect(Option.getOrUndefined(VectorAnnotation.getFromAst(Vec3.ast))).toBe(true);
    expect(isVectorType(Vec3.ast)).toBe(true);
  });

  test('the helper sets the same annotation', ({ expect }) => {
    const Vec2 = Schema.Struct({ x: Schema.Number, y: Schema.Number }).pipe(VectorAnnotation.set(true));
    expect(isVectorType(Vec2.ast)).toBe(true);
  });

  test('an unmarked struct or a marked scalar is no vector', ({ expect }) => {
    expect(isVectorType(Schema.Struct({ x: Schema.Number }).ast)).toBe(false);
    expect(isVectorType(Schema.Number.pipe(VectorAnnotation.set(true)).ast)).toBe(false);
  });
});

describe('getVectorAxes', () => {
  test('coordinates are labelled by their names, in schema order', ({ expect }) => {
    expect(getVectorAxes(Vec3.ast).map(({ name, label }) => [name, label])).toEqual([
      ['x', 'x'],
      ['y', 'y'],
      ['z', 'z'],
    ]);
  });

  test('every axis is labelled x, y, z by position, a size included', ({ expect }) => {
    const Size2 = Schema.Struct({
      width: Schema.Number.annotate({ title: 'Width' }),
      height: Schema.Number.annotate({ title: 'Height' }),
    });
    expect(getVectorAxes(Size2.ast).map(({ label }) => label)).toEqual(['x', 'y']);
  });

  test('non-numeric properties are skipped and do not take a letter', ({ expect }) => {
    const Polar = Schema.Struct({
      radius: Schema.Number.annotate({ title: 'r' }),
      angle: Schema.Number,
      unit: Schema.String,
    });
    expect(getVectorAxes(Polar.ast).map(({ label }) => label)).toEqual(['x', 'y']);
  });

  test('an optional axis is still an axis', ({ expect }) => {
    const Scale = Schema.Struct({ x: Schema.optional(Schema.Number), y: Schema.optional(Schema.Number) });
    expect(getVectorAxes(Scale.ast).map(({ name }) => name)).toEqual(['x', 'y']);
  });
});
