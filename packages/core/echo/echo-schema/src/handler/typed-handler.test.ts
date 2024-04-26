//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { create } from './create';
import { ref } from '../ref-annotation';
import { TEST_SCHEMA_TYPE } from '../testing';
import { TypedObject } from '../typed-object-class';

describe('complex schema validations', () => {
  const setValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
  };

  test('any', () => {
    const schema = S.struct({ field: S.any });
    const object = create(schema, { field: { nested: { value: S.number } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('references', () => {
    class Foo extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.string }) {}

    class Bar extends TypedObject(TEST_SCHEMA_TYPE)({ fooRef: ref(Foo) }) {}

    const field = 'hello';
    expect(() => create(Bar, { fooRef: { id: '1', field } })).to.throw();
    const bar = create(Bar, { fooRef: create(Foo, { field }) });
    expect(bar.fooRef?.field).to.eq(field);
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
