//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, expect, test } from 'vitest';

import { mapSchemaToFields } from './field';
import { FieldValueType } from './types';

// TODO(burdon): Realistic data.
// TODO(burdon): Handle Any, arrays, etc.

// TODO(burdon): Only is ignored.

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
