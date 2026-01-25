//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as Obj from '../../Obj';
import { TestSchema } from '../../testing';
import { EchoObjectSchema } from '../entities';
import { Ref } from '../ref';
import { foreignKey, getMeta } from '../types';

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
    const Foo = Schema.Struct({ field: Schema.String }).pipe(
      EchoObjectSchema({ typename: 'example.com/type/Foo', version: '0.1.0' }),
    );
    const Bar = Schema.Struct({ fooRef: Ref(Foo) }).pipe(
      EchoObjectSchema({ typename: 'example.com/type/Bar', version: '0.1.0' }),
    );
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

  // NOTE: Test for nesting typed objects in untyped containers was removed.
  // Untyped reactive objects are no longer supported - use Atoms for untyped reactive state.

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

  test('subscribe', () => {
    const TestSchema = Schema.mutable(Schema.Struct({ field: Schema.String })).pipe(
      EchoObjectSchema({ typename: 'Test', version: '0.1.0' }),
    );
    const object = makeObject(TestSchema, { field: 'value' });
    let called = 0;
    const unsubscribe = Obj.subscribe(object as any, () => {
      called++;
    });

    object.field = 'value2';
    expect(called).to.eq(1);

    unsubscribe();
    object.field = 'value3';
    expect(called).to.eq(1);
  });
});

describe('object structure restrictions', () => {
  const NestedSchema = Schema.Struct({
    data: Schema.optional(Schema.Any),
    nested: Schema.optional(Schema.Any),
  });

  test('prevents direct cycles', () => {
    const obj = makeObject(NestedSchema, { data: null });
    expect(() => {
      obj.data = obj;
    }).to.throw('Cannot create cycles');
  });

  test('prevents indirect cycles via nested objects', () => {
    const obj = makeObject(NestedSchema, {
      nested: { value: 1 },
    });
    expect(() => {
      obj.nested.parent = obj;
    }).to.throw('Cannot create cycles');
  });

  test('copy-on-assign for cross-proxy assignment', () => {
    const obj1 = makeObject(NestedSchema, {
      data: { shared: 'original' },
    });
    const obj2 = makeObject(NestedSchema, {});

    // Assign obj1's nested data to obj2.
    obj2.data = obj1.data;

    // Should be a copy, not the same reference.
    expect(obj2.data).to.deep.eq({ shared: 'original' });

    // Modifying obj2.data should not affect obj1.data.
    obj2.data.shared = 'modified';
    expect(obj1.data.shared).to.eq('original');
    expect(obj2.data.shared).to.eq('modified');
  });

  test('allows assigning within same typed object', () => {
    const obj = makeObject(NestedSchema, {
      data: { value: 1 },
      nested: null,
    });

    // Moving data within the same typed object should work without copying.
    const originalData = obj.data;
    obj.nested = obj.data;
    obj.data = null;

    expect(obj.nested).to.deep.eq({ value: 1 });
  });

  test('allows assigning plain objects (not owned by any typed object)', () => {
    const obj = makeObject(NestedSchema, {});
    const plainData = { value: 'plain' };

    obj.data = plainData;
    expect(obj.data).to.deep.eq({ value: 'plain' });

    // Modifying the original plain object should not affect the typed object
    // (since it's been claimed by the typed object).
    plainData.value = 'changed';
    // The value in obj.data depends on when ownership is claimed.
    // After assignment, the typed object owns it.
  });
});
