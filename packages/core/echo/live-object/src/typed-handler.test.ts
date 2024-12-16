//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Ref, TypedObject, foreignKey } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

import { getMeta } from './accessors';
import { create } from './object';
import { makeRef } from './ref';

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

  test('references', () => {
    class Foo extends TypedObject({ typename: 'example.com/type/Foo', version: '0.1.0' })({ field: S.String }) {}
    class Bar extends TypedObject({ typename: 'example.com/type/Bar', version: '0.1.0' })({ fooRef: Ref(Foo) }) {}
    const field = 'hello';
    expect(() => create(Bar, { fooRef: { id: '1', field } as any })).to.throw();
    expect(() => create(Bar, { fooRef: undefined as any })).to.throw(); // Unresolved reference.
    const bar = create(Bar, { fooRef: makeRef(create(Foo, { field })) });
    expect(bar.fooRef.target?.field).to.eq(field);
  });

  test('index signatures', () => {
    const schema = S.Struct({}, { key: S.String, value: S.Number });
    const object = create(schema, { unknownField: 1 });
    expect(() => setValue(object, 'field', '42')).to.throw();
    expect(() => setValue(object, 'unknown_field', 42)).not.to.throw();
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
