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
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.keywordHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
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
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.structHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('schema');
  });

  test('filters out array fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.arrayHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('context');
  });

  test('filters out optional fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    // Regression: optional fields' `prop.type` is the union `T | undefined`; the
    // annotation lives on the inner `T`. Without unwrapping, the filter would
    // miss the annotation and the hidden field would render. Covers the
    // conventional pattern `Schema.X.pipe(FormInputAnnotation.set(false), Schema.optional)`.
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      userId: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.optionalHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('userId');
  });

  test('preserves annotation when chained with .annotations()', ({ expect }) => {
    // Regression: `.pipe(FormInputAnnotation.set(false)).annotations({...})` must
    // not lose the form-input annotation.
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      hidden: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
        description: 'Hidden field',
      }),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.chainedHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('hidden');
  });
});
