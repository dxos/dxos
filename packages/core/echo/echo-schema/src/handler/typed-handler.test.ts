//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { create } from './create';

describe('complex schema validations', () => {
  const setValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
  };

  test('any', () => {
    const schema = S.struct({ field: S.any });

    const object = create(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test.only('object', () => {
    const schema = S.struct({ field: S.optional(S.object) });

    const object = create(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('index signatures', () => {
    const schema = S.struct({}, { key: S.string, value: S.number });

    const object = create(schema, { unknownField: 1 });
    expect(() => setValue(object, 'field', '42')).to.throw();
    expect(() => setValue(object, 'unknownField', 42)).not.to.throw();
  });

  test('suspend', () => {
    const schema = S.struct({
      array: S.optional(S.suspend(() => S.array(S.union(S.null, S.number)))),
      object: S.optional(S.suspend(() => S.union(S.null, S.struct({ field: S.number })))),
    });

    const object = create(schema, { array: [1, 2, null], object: { field: 3 } });
    expect(() => setValue(object, 'object', { field: 4 })).not.to.throw();
    expect(() => setValue(object.object, 'field', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', '4')).to.throw();
  });
});
