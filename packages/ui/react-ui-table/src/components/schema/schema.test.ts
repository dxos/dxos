//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { classifySchemaProperties } from './schema';

// TODO(zan): Remove this utility
const _failwith = (...data: any) => {
  // if data is an array, we want to log each element separately
  // intelligently stringify antyhing that isn't a string
  const message = data.map((d: any) => (typeof d === 'string' ? d : JSON.stringify(d, null, 2))).join('\n');

  throw new Error(message);
};

describe('schema->column-type', () => {
  test('basic', () => {
    const simpleSchema = S.struct({
      field1: S.string,
      field2: S.number,
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('optional properties', () => {
    const simpleSchema = S.struct({
      field1: S.optional(S.string),
      field2: S.optional(S.number),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);
  });

  test('dates', () => {
    const simpleSchema = S.struct({
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
    const simpleSchema = S.struct({
      name: S.optional(S.string.pipe(S.nonEmpty(), S.maxLength(10))),
      age: S.number.pipe(S.negative()),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['age', 'number'],
    ]);
  });

  test('nested schema', () => {
    const simpleSchema = S.struct({
      name: S.string,
      nested: S.struct({
        age: S.number,
      }),
      someUnion: S.union(S.string, S.number),
    });

    const columns = classifySchemaProperties(simpleSchema);

    expect(columns).to.deep.equal([
      ['name', 'string'],
      ['nested.age', 'number'],
      ['someUnion', 'display'],
    ]);
  });

  test('deeply nested schema', () => {
    const simpleSchema = S.struct({
      name: S.string,
      nested: S.struct({
        age: S.number,
        deeplyNested: S.struct({
          height: S.number,
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
    const simpleSchema = S.struct({
      name: S.string,
      nested: S.struct({
        age: S.number,
        deeplyNested: S.optional(
          S.struct({
            height: S.optional(S.number),
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
    const simpleSchema = S.struct({
      name: S.string,
      nested: S.struct({
        age: S.number,
      }),
      nested2: S.struct({
        height: S.number,
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
