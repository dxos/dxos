//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import { describe, test, expect } from 'vitest';

import { AST, getProperty } from '@dxos/effect';

import { getFieldValue } from './field';
import { testData, testView, TestSchema } from '../testing';

describe('schema', () => {
  test('JSON path', () => {
    const p1 = AST.getPropertySignatures(TestSchema.ast).find((p) => p.name.toString() === 'name')!;
    expect(pipe(AST.getDescriptionAnnotation(p1.type), Option.getOrNull)).to.eq('Full name.');

    const [col1, col2, col3] = testView.properties;
    expect(getFieldValue(testData, col1)).to.eq('Tester');
    expect(getFieldValue(testData, col2)).to.eq('test@example.com');
    expect(getFieldValue(testData, col3)).to.eq('11205');

    const p2 = getProperty(TestSchema, col2.path)!;
    expect(pipe(AST.getDescriptionAnnotation(p2), Option.getOrNull)).to.exist;

    const p3 = getProperty(TestSchema, col3.path)!;
    expect(pipe(AST.getDescriptionAnnotation(p3), Option.getOrNull)).to.eq('ZIP code.');
  });
});

describe('mapSchemaToFields', () => {
  test('basic', () => {
    const TestSchema = S.Struct({
      field1: S.String,
      field2: S.Number,
      field3: S.Date,
    });

    const fields = mapSchemaToFields(TestSchema);
    expect(fields).to.deep.equal([
      ['field1', FieldValueType.String],
      ['field2', FieldValueType.Number],
      ['field3', FieldValueType.Date],
    ]);
  });

  test('optional properties', () => {
    const TestSchema = S.Struct({
      field1: S.optional(S.String),
      field2: S.optional(S.Number),
    });

    const fields = mapSchemaToFields(TestSchema);
    expect(fields).to.deep.equal([
      ['field1', FieldValueType.String],
      ['field2', FieldValueType.Number],
    ]);
  });

  test('nested schema', () => {
    const TestSchema = S.Struct({
      name: S.String,
      nested1: S.Struct({
        age: S.Number,
        deeplyNested: S.Struct({
          height: S.optional(S.Number),
        }),
      }),
      nested2: S.Struct({
        height: S.Number,
      }),
    });

    const fields = mapSchemaToFields(TestSchema);
    expect(fields).to.deep.equal([
      ['name', FieldValueType.String],
      ['nested1.age', FieldValueType.Number],
      ['nested1.deeplyNested.height', FieldValueType.Number],
      ['nested2.height', FieldValueType.Number],
    ]);
  });

  test('piped validators', () => {
    const TestSchema = S.Struct({
      name: S.optional(S.String.pipe(S.nonEmptyString(), S.maxLength(10))),
      age: S.Number.pipe(S.negative()),
    });

    const fields = mapSchemaToFields(TestSchema);
    expect(fields).to.deep.equal([
      ['name', FieldValueType.String],
      ['age', FieldValueType.Number],
    ]);
  });
});
