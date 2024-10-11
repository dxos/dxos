//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, expect, test } from 'vitest';

import { getColumnTypes } from './schema';

// TODO(burdon): Realistic data.

describe('getColumnTypes', () => {
  test('basic', () => {
    const schema = S.Struct({
      field1: S.String,
      field2: S.Number,
      field3: S.Date,
    });

    const columns = getColumnTypes(schema);
    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
      ['field3', 'date'],
    ]);
  });

  test('optional properties', () => {
    const schema = S.Struct({
      field1: S.optional(S.String),
      field2: S.optional(S.Number),
    });

    const columns = getColumnTypes(schema);
    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('piped validators', () => {
    const schema = S.Struct({
      name: S.optional(S.String.pipe(S.nonEmptyString(), S.maxLength(10))),
      age: S.Number.pipe(S.negative()),
    });

    const columns = getColumnTypes(schema);
    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['age', 'number'],
    ]);
  });

  test('nested schema', () => {
    const schema = S.Struct({
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

    const columns = getColumnTypes(schema);
    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested1.age', 'number'],
      ['nested1.deeplyNested.height', 'number'],
      ['nested2.height', 'number'],
    ]);
  });
});
