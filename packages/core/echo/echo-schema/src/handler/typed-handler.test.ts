//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { create } from './object';
import { getMeta } from '../getter';
import { foreignKey } from '../types';

describe('complex schema validations', () => {
  const setValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
  };

  test('any', () => {
    const schema = S.Struct({ field: S.Any });

    const object = create(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('meta', () => {
    const source = 'test';
    const schema = S.Struct({ field: S.Number });
    const object = create(schema, { field: 42 }, { keys: [foreignKey(source, '123')] });
    expect(getMeta(object).keys).to.deep.eq([foreignKey(source, '123')]);
  });

  test('object', () => {
    const schema = S.Struct({ field: S.optional(S.Object) });

    const object = create(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('index signatures', () => {
    const schema = S.Struct({}, { key: S.String, value: S.Number });

    const object = create(schema, { unknownField: 1 });
    expect(() => setValue(object, 'field', '42')).to.throw();
    expect(() => setValue(object, 'unknownField', 42)).not.to.throw();
  });

  test('suspend', () => {
    const schema = S.Struct({
      array: S.optional(S.suspend(() => S.Array(S.Union(S.Null, S.Number)))),
      object: S.optional(S.suspend(() => S.Union(S.Null, S.Struct({ field: S.Number })))),
    });

    const object = create(schema, { array: [1, 2, null], object: { field: 3 } });
    expect(() => setValue(object, 'object', { field: 4 })).not.to.throw();
    expect(() => setValue(object.object, 'field', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', '4')).to.throw();
  });
});
