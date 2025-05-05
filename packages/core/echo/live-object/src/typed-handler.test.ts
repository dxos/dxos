//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, expect, test } from 'vitest';

import { Ref, TypedObject, create, foreignKey, getSchema, isInstanceOf } from '@dxos/echo-schema';
import { Testing } from '@dxos/echo-schema/testing';

import { getMeta } from './accessors';
import { live } from './object';
import { makeRef } from './ref';

describe('complex schema validations', () => {
  const setValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
  };

  test('any', () => {
    const schema = S.Struct({ field: S.Any });
    const object = live(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('meta', () => {
    const source = 'test';
    const schema = S.Struct({ field: S.Number });
    const object = live(schema, { field: 42 }, { keys: [foreignKey(source, '123')] });
    expect(getMeta(object).keys).to.deep.eq([foreignKey(source, '123')]);
  });

  test('object', () => {
    const schema = S.Struct({ field: S.optional(S.Object) });
    const object = live(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('references', () => {
    class Foo extends TypedObject({ typename: 'example.com/type/Foo', version: '0.1.0' })({ field: S.String }) {}
    class Bar extends TypedObject({ typename: 'example.com/type/Bar', version: '0.1.0' })({ fooRef: Ref(Foo) }) {}
    const field = 'hello';
    expect(() => live(Bar, { fooRef: { id: '1', field } as any })).to.throw();
    expect(() => live(Bar, { fooRef: undefined as any })).to.throw(); // Unresolved reference.
    const bar = live(Bar, { fooRef: makeRef(live(Foo, { field })) });
    expect(bar.fooRef.target?.field).to.eq(field);
  });

  test('index signatures', () => {
    const schema = S.Struct({}, { key: S.String, value: S.Number });
    const object = live(schema, { unknownField: 1 });
    expect(() => setValue(object, 'field', '42')).to.throw();
    expect(() => setValue(object, 'unknown_field', 42)).not.to.throw();
  });

  test('suspend', () => {
    const schema = S.Struct({
      array: S.optional(S.suspend(() => S.Array(S.Union(S.Null, S.Number)))),
      object: S.optional(S.suspend(() => S.Union(S.Null, S.Struct({ field: S.Number })))),
    });

    const object = live(schema, { array: [1, 2, null], object: { field: 3 } });
    expect(() => setValue(object, 'object', { field: 4 })).not.to.throw();
    expect(() => setValue(object.object, 'field', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', '4')).to.throw();
  });

  test('nesting static objects with schema in the live object', () => {
    const contact1 = create(Testing.Contact, {
      name: 'Robert Smith',
      email: 'robert@example.com',
    } as any);
    const contact2 = create(Testing.Contact, {
      name: 'Katy Perry',
      email: 'katy@example.com',
    } as any);

    const contactBook = live({
      contacts: [contact1],
    });

    expect(isInstanceOf(Testing.Contact, contactBook.contacts[0])).to.eq(true);
    expect(getSchema(contactBook.contacts[0])).to.eq(Testing.Contact);

    contactBook.contacts.push(contact2);
    expect(isInstanceOf(Testing.Contact, contactBook.contacts[1])).to.eq(true);
    expect(getSchema(contactBook.contacts[1])).to.eq(Testing.Contact);
  });
});
