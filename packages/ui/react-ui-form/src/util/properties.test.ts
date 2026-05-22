//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Annotation, JsonSchema, Type } from '@dxos/echo';

import { getFormProperties } from './properties';

describe('getFormProperties', () => {
  test('filters out keyword fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      hidden: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.object(DXN.fromNsidAndVersion('org.dxos.test.keyword-hidden', '0.1.0')));

    const names = getFormProperties(TestSchema.ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('hidden');
  });

  test('filters out struct fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    // Regression: JsonSchema fields are a Schema.Struct; encodedBoundAST strips
    // annotations from non-keyword inner types, which previously bypassed the
    // form-input filter (e.g., Routine.input).
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      schema: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.object(DXN.fromNsidAndVersion('org.dxos.test.struct-hidden', '0.1.0')));

    const names = getFormProperties(TestSchema.ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('schema');
  });

  test('filters out array fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.object(DXN.fromNsidAndVersion('org.dxos.test.array-hidden', '0.1.0')));

    const names = getFormProperties(TestSchema.ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('context');
  });

  test('preserves annotation when chained with .annotations()', ({ expect }) => {
    // Regression: `.pipe(FormInputAnnotation.set(false)).annotations({...})` must
    // not lose the form-input annotation.
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      hidden: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
        description: 'Hidden field',
      }),
    }).pipe(Type.object(DXN.fromNsidAndVersion('org.dxos.test.chained-hidden', '0.1.0')));

    const names = getFormProperties(TestSchema.ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('hidden');
  });
});
