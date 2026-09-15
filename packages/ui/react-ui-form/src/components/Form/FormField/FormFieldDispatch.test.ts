//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Format } from '@dxos/echo';

import { type FormFieldRendererProps } from '#types';

import { HueAnnotation } from '../../../annotations.ts';
import { BooleanField, NumberField, PasswordField, TextField } from './fields/index.ts';
import { resolveFieldRenderer } from './FormFieldDispatch.tsx';

describe('resolveFieldRenderer', () => {
  // Only `type` and `format` reach the decision; the rest is the renderer's business.
  const resolve = (schema: Schema.Top, value: unknown = undefined, fieldMap?: Record<string, any>) => {
    const type = schema.ast;
    const fieldProps = {
      type,
      format: Format.FormatAnnotation.getFromAst(type).pipe((annotation) =>
        annotation._tag === 'Some' ? annotation.value : undefined,
      ),
    } as FormFieldRendererProps;
    return resolveFieldRenderer({ type, name: 'field', jsonPath: 'field', value, fieldProps, fieldMap });
  };

  test('scalars by tag', ({ expect }) => {
    expect(resolve(Schema.String)).toEqual({ kind: 'scalar', component: TextField });
    expect(resolve(Schema.Number)).toEqual({ kind: 'scalar', component: NumberField });
    expect(resolve(Schema.Boolean)).toEqual({ kind: 'scalar', component: BooleanField });
  });

  test('a format outranks the tag', ({ expect }) => {
    expect(resolve(Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)))).toEqual({
      kind: 'scalar',
      component: PasswordField,
    });
  });

  test('an annotation outranks the shape', ({ expect }) => {
    expect(resolve(Schema.String.pipe(HueAnnotation.set(true)))).toEqual({ kind: 'hue' });
  });

  test('a custom renderer outranks everything', ({ expect }) => {
    const Custom = () => null;
    expect(resolve(Schema.String, undefined, { field: Custom })).toEqual({ kind: 'custom', component: Custom });
  });

  test('shapes: array, literal options, nested object', ({ expect }) => {
    expect(resolve(Schema.Array(Schema.String))).toEqual({ kind: 'array' });
    expect(resolve(Schema.Literals(['a', 'b']))).toEqual({ kind: 'select', options: ['a', 'b'] });
    const nested = resolve(Schema.Struct({ street: Schema.String }));
    expect(nested?.kind).toBe('object');
  });

  test('a discriminated union picks its member by the value', ({ expect }) => {
    const union = Schema.Union([
      Schema.Struct({ kind: Schema.Literal('a'), a: Schema.String }),
      Schema.Struct({ kind: Schema.Literal('b'), b: Schema.Number }),
    ]);
    const resolution = resolve(union, { kind: 'b' });
    expect(resolution?.kind).toBe('object');
    if (resolution?.kind === 'object') {
      const isMember = Schema.is(resolution.schema);
      expect(isMember({ kind: 'b', b: 1 })).toBe(true);
      expect(isMember({ kind: 'a', a: 'x' })).toBe(false);
    }
  });
});
