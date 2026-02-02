//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { TestSchema } from '../../testing';
import { EchoObjectSchema } from '../entities';
import { setValue } from '../object';
import { Ref } from '../ref';
import { foreignKey, getMeta } from '../types';

import { makeObject } from './make-object';
import { change, subscribe } from './reactive';

describe('complex schema validations', () => {
  test('any', () => {
    const schema = Schema.Struct({ field: Schema.Any });
    const object = makeObject(schema, { field: { nested: { value: 100 } } });
    change(object, (o) => {
      expect(() => (o.field = { any: 'value' })).not.to.throw();
    });
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
    change(object, (o) => {
      expect(() => (o.field = { any: 'value' })).not.to.throw();
    });
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
    change(object, (o) => {
      expect(() => setValue(o, ['field'], '42')).to.throw();
      expect(() => setValue(o, ['unknown_field'], 42)).not.to.throw();
    });
  });

  test('suspend', () => {
    const schema = Schema.Struct({
      array: Schema.optional(Schema.suspend(() => Schema.Array(Schema.Union(Schema.Null, Schema.Number)))),
      object: Schema.optional(Schema.suspend(() => Schema.Union(Schema.Null, Schema.Struct({ field: Schema.Number })))),
    });

    const object = makeObject(schema, { array: [1, 2, null], object: { field: 3 } });
    change(object, (o) => {
      expect(() => (o.object = { field: 4 })).not.to.throw();
      expect(() => setValue(o, ['object', 'field'], 4)).not.to.throw();
      expect(() => setValue(o, ['array', 0], 4)).not.to.throw();
      expect(() => setValue(o, ['array', 0], '4')).to.throw();
    });
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
    const TestSchema = Schema.Struct({ field: Schema.String }).pipe(
      EchoObjectSchema({ typename: 'Test', version: '0.1.0' }),
    );
    const object = makeObject(TestSchema, { field: 'value' });
    let called = 0;
    const unsubscribe = subscribe(object as any, () => {
      called++;
    });

    change(object, (o) => {
      o.field = 'value2';
    });
    expect(called).to.eq(1);

    unsubscribe();
    change(object, (o) => {
      o.field = 'value3';
    });
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
    change(obj, (o) => {
      expect(() => {
        o.data = obj;
      }).to.throw('Cannot create cycles');
    });
  });

  test('prevents indirect cycles via nested objects', () => {
    const obj = makeObject(NestedSchema, {
      nested: { value: 1 },
    });
    change(obj, (o) => {
      expect(() => {
        o.nested.parent = obj;
      }).to.throw('Cannot create cycles');
    });
  });

  test('copy-on-assign for cross-proxy assignment', () => {
    const obj1 = makeObject(NestedSchema, {
      data: { shared: 'original' },
    });
    const obj2 = makeObject(NestedSchema, {});

    // Assign obj1's nested data to obj2.
    change(obj2, (o) => {
      o.data = obj1.data;
    });

    // Should be a copy, not the same reference.
    expect(obj2.data).to.deep.eq({ shared: 'original' });

    // Modifying obj2.data should not affect obj1.data.
    change(obj2, (o) => {
      o.data.shared = 'modified';
    });
    expect(obj1.data.shared).to.eq('original');
    expect(obj2.data.shared).to.eq('modified');
  });

  test('allows assigning within same typed object', () => {
    const obj = makeObject(NestedSchema, {
      data: { value: 1 },
      nested: null,
    });

    // Moving data within the same typed object should work without copying.
    change(obj, (o) => {
      o.nested = o.data;
      o.data = null;
    });

    expect(obj.nested).to.deep.eq({ value: 1 });
  });

  test('allows assigning plain objects (not owned by any typed object)', () => {
    const obj = makeObject(NestedSchema, {});
    const plainData = { value: 'plain' };

    change(obj, (o) => {
      o.data = plainData;
    });
    expect(obj.data).to.deep.eq({ value: 'plain' });

    // Modifying the original plain object should not affect the typed object
    // (since it's been claimed by the typed object).
    plainData.value = 'changed';
    // The value in obj.data depends on when ownership is claimed.
    // After assignment, the typed object owns it.
  });

  test('deeply nested objects are owned by root ECHO object', () => {
    const obj = makeObject(NestedSchema, {
      data: {
        level1: {
          level2: {
            value: 'deep',
          },
        },
      },
    });

    // All nested objects should be owned.
    // Assigning any of them to another ECHO object should trigger copy.
    const obj2 = makeObject(NestedSchema, {});
    change(obj2, (o) => {
      o.data = obj.data.level1;
    });

    // Should be a copy.
    expect(obj2.data).to.deep.eq({ level2: { value: 'deep' } });

    // Modifying should not affect original.
    change(obj2, (o) => {
      o.data.level2.value = 'modified';
    });
    expect(obj.data.level1.level2.value).to.eq('deep');
  });

  test('array elements are owned by root ECHO object', () => {
    const ArraySchema = Schema.Struct({
      items: Schema.Array(Schema.Any),
    });

    const obj1 = makeObject(ArraySchema, {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });

    const obj2 = makeObject(ArraySchema, { items: [] });

    // Assign an array element from obj1 to obj2.
    change(obj2, (o) => {
      o.items.push(obj1.items[0]);
    });

    // Should be a copy.
    expect(obj2.items[0]).to.deep.eq({ id: 1 });

    // Modifying should not affect original.
    change(obj2, (o) => {
      o.items[0].id = 100;
    });
    expect(obj1.items[0].id).to.eq(1);
  });

  test('centralized reactivity - direct property mutation triggers event', () => {
    const obj = makeObject(NestedSchema, {
      data: { value: 1 },
    });

    let notificationCount = 0;
    const unsubscribe = subscribe(obj as any, () => {
      notificationCount++;
    });

    // Mutate direct property.
    change(obj, (o) => {
      o.data = { value: 2 };
    });
    expect(notificationCount).to.eq(1);

    unsubscribe();
  });

  test('centralized reactivity - nested mutation triggers event on root', () => {
    const obj = makeObject(NestedSchema, {
      data: { level1: { value: 1 } },
    });

    let notificationCount = 0;
    const unsubscribe = subscribe(obj as any, () => {
      notificationCount++;
    });

    // Mutate deeply nested property - should trigger event on root.
    change(obj, (o) => {
      o.data.level1.value = 2;
    });
    expect(notificationCount).to.eq(1);

    // Another nested mutation.
    change(obj, (o) => {
      o.data.level1 = { value: 3 };
    });
    expect(notificationCount).to.eq(2);

    unsubscribe();
  });

  test('reassigning owned object to same root does not copy', () => {
    const obj = makeObject(NestedSchema, {
      data: { original: true },
      nested: null,
    });

    // Get reference to the nested data.
    const originalData = obj.data;

    // Move within same ECHO object.
    change(obj, (o) => {
      o.nested = o.data;
      o.data = null;
    });

    // Should be the same object (no copy).
    expect(obj.nested).to.eq(originalData);
  });
});
