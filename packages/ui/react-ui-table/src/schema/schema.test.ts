//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { S } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { classifySchemaProperties } from './schema';

describe('schema->column-type', () => {
  test('basic', () => {
    const simpleSchema = S.Struct({
      field1: S.String,
      field2: S.Number,
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('optional properties', () => {
    const simpleSchema = S.Struct({
      field1: S.optional(S.String),
      field2: S.optional(S.Number),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('dates', () => {
    const simpleSchema = S.Struct({
      field1: S.Date,
      field2: S.optional(S.Date),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'date'],
      ['field2', 'date'],
    ]);
  });

  test('Piped validators', () => {
    const simpleSchema = S.Struct({
      name: S.optional(S.String.pipe(S.nonEmpty(), S.maxLength(10))),
      age: S.Number.pipe(S.negative()),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['age', 'number'],
    ]);
  });

  test('nested schema', () => {
    const simpleSchema = S.Struct({
      name: S.String,
      nested: S.Struct({
        age: S.Number,
      }),
      someUnion: S.Union(S.String, S.Number),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested.age', 'number'],
      ['someUnion', 'display'],
    ]);
  });

  test('deeply nested schema', () => {
    const simpleSchema = S.Struct({
      name: S.String,
      nested: S.Struct({
        age: S.Number,
        deeplyNested: S.Struct({
          height: S.Number,
        }),
      }),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested.age', 'number'],
      ['nested.deeplyNested.height', 'number'],
    ]);
  });

  test('even more deeply nested schema with optionals', () => {
    const simpleSchema = S.Struct({
      name: S.String,
      nested: S.Struct({
        age: S.Number,
        deeplyNested: S.optional(
          S.Struct({
            height: S.optional(S.Number),
          }),
        ),
      }),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested.age', 'number'],
      ['nested.deeplyNested.height', 'number'],
    ]);
  });

  test('multiple-nested schemata as sibblings', () => {
    const simpleSchema = S.Struct({
      name: S.String,
      nested: S.Struct({
        age: S.Number,
      }),
      nested2: S.Struct({
        height: S.Number,
      }),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested.age', 'number'],
      ['nested2.height', 'number'],
    ]);
  });
});
