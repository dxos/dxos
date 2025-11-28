//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { TestSchema } from '../../testing';
import { isInstanceOf } from '../annotations';
import { TypedObject, createObject } from '../object';
import { Ref } from '../ref';
import { foreignKey, getMeta, getSchema } from '../types';

import { makeObject } from './make-object';

describe('complex schema validations', () => {
  const setValue = (target: any, prop: string, value: any) => {
    target[prop] = value;
  };

  test('any', () => {
    const schema = Schema.Struct({ field: Schema.Any });
    const object = makeObject(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('meta', () => {
    const source = 'test';
    const schema = Schema.Struct({ field: Schema.Number });
    const object = makeObject(schema, { field: 42 }, { keys: [foreignKey(source, '123')] });
    expect(getMeta(object).keys).to.deep.eq([foreignKey(source, '123')]);
  });

  test('object', () => {
    const schema = Schema.Struct({ field: Schema.optional(Schema.Object) });
    const object = makeObject(schema, { field: { nested: { value: 100 } } });
    expect(() => setValue(object, 'field', { any: 'value' })).not.to.throw();
  });

  test('references', () => {
    class Foo extends TypedObject({ typename: 'example.com/type/Foo', version: '0.1.0' })({ field: Schema.String }) {}
    class Bar extends TypedObject({ typename: 'example.com/type/Bar', version: '0.1.0' })({ fooRef: Ref(Foo) }) {}
    const field = 'hello';
    expect(() => makeObject(Bar, { fooRef: { id: '1', field } as any })).to.throw();
    expect(() => makeObject(Bar, { fooRef: undefined as any })).to.throw(); // Unresolved reference.
    const bar = makeObject(Bar, { fooRef: Ref.make(makeObject(Foo, { field })) });
    expect(bar.fooRef.target?.field).to.eq(field);
  });

  test('index signatures', () => {
    const schema = Schema.Struct({}, { key: Schema.String, value: Schema.Number });
    const object = makeObject(schema, { unknownField: 1 });
    expect(() => setValue(object, 'field', '42')).to.throw();
    expect(() => setValue(object, 'unknown_field', 42)).not.to.throw();
  });

  test('suspend', () => {
    const schema = Schema.Struct({
      array: Schema.optional(Schema.suspend(() => Schema.Array(Schema.Union(Schema.Null, Schema.Number)))),
      object: Schema.optional(Schema.suspend(() => Schema.Union(Schema.Null, Schema.Struct({ field: Schema.Number })))),
    });

    const object = makeObject(schema, { array: [1, 2, null], object: { field: 3 } });
    expect(() => setValue(object, 'object', { field: 4 })).not.to.throw();
    expect(() => setValue(object.object, 'field', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', 4)).not.to.throw();
    expect(() => setValue(object.array, '0', '4')).to.throw();
  });

  test('nesting static objects with schema in the live object', () => {
    const contact1 = createObject(TestSchema.Person, {
      name: 'Robert Smith',
      email: 'robert@example.com',
    } as any);
    const contact2 = createObject(TestSchema.Person, {
      name: 'Katy Perry',
      email: 'katy@example.com',
    } as any);

    const network = makeObject({ contacts: [contact1] });
    expect(isInstanceOf(TestSchema.Person, network.contacts[0])).to.eq(true);
    expect(getSchema(network.contacts[0])).to.eq(TestSchema.Person);

    network.contacts.push(contact2);
    expect(isInstanceOf(TestSchema.Person, network.contacts[1])).to.eq(true);
    expect(getSchema(network.contacts[1])).to.eq(TestSchema.Person);
  });

  test('creating an object with data from another object', () => {
    const contact = makeObject(TestSchema.Person, {
      name: 'Robert Smith',
      email: 'robert@example.com',
    });

    const TempSchema = Schema.Struct({ value: Schema.Unknown });
    const object = makeObject(TempSchema, {
      value: contact,
    });

    expect((object.value as any).name).to.eq('Robert Smith');
  });
});
