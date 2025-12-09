//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Obj from '../../Obj';
import { TestSchema } from '../../testing';
import * as Type from '../../Type';

describe('Obj.setValue', () => {
  test('sets simple nested object property', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['address', 'city'], 'NYC');

    expect(person.address).toBeDefined();
    expect(person.address?.city).toBe('NYC');
  });

  test('sets array element by initializing array', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['fields', 0, 'label'], 'Phone');

    expect(Array.isArray(person.fields)).toBe(true);
    expect(person.fields?.[0].label).toBe('Phone');
    // The 'value' field is required, so it should be initialized with default.
    expect(person.fields?.[0].value).toBe('');
  });

  test('sets deeply nested array in object', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['address', 'coordinates', 'lat'], 40.7128);

    expect(person.address).toBeDefined();
    expect(person.address?.coordinates).toBeDefined();
    expect(person.address?.coordinates?.lat).toBe(40.7128);
  });

  test('sets multiple nested array elements', ({ expect }) => {
    const Item = Schema.Struct({
      value: Schema.optional(Schema.Number),
    }).pipe(Schema.mutable);

    const Container = Schema.Struct({
      name: Schema.String,
      items: Schema.optional(Schema.mutable(Schema.Array(Item))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Container',
        version: '0.1.0',
      }),
    );

    const container = Obj.make(Container, { name: 'box' });

    Obj.setValue(container, ['items', 0, 'value'], 10);
    Obj.setValue(container, ['items', 1, 'value'], 20);
    Obj.setValue(container, ['items', 2, 'value'], 30);

    expect(container.items).toHaveLength(3);
    expect(container.items?.[0].value).toBe(10);
    expect(container.items?.[1].value).toBe(20);
    expect(container.items?.[2].value).toBe(30);
  });

  test('handles optional fields', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['age'], 25);

    expect(person.age).toBe(25);
  });

  test('handles nested optional objects', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['address', 'city'], 'NYC');

    expect(person.address).toBeDefined();
    expect(person.address?.city).toBe('NYC');
  });

  test('returns the set value', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    const result = Obj.setValue(person, ['age'], 30);

    expect(result).toBe(30);
  });

  test('overwrites existing values', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
      age: 25,
    });

    Obj.setValue(person, ['age'], 30);

    expect(person.age).toBe(30);
  });

  test('sets nested value in existing object', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
      address: { city: 'Boston', state: 'MA', coordinates: {} },
    });

    Obj.setValue(person, ['address', 'city'], 'NYC');

    expect(person.address?.city).toBe('NYC');
    expect(person.address?.state).toBe('MA');
  });

  test('handles two-dimensional arrays', ({ expect }) => {
    const Matrix = Schema.Struct({
      values: Schema.optional(Schema.mutable(Schema.Array(Schema.mutable(Schema.Array(Schema.Number))))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Matrix',
        version: '0.1.0',
      }),
    );

    const matrix = Obj.make(Matrix, {});

    Obj.setValue(matrix, ['values', 0, 0], 1);
    Obj.setValue(matrix, ['values', 0, 1], 2);
    Obj.setValue(matrix, ['values', 1, 0], 3);
    Obj.setValue(matrix, ['values', 1, 1], 4);

    expect(matrix.values?.[0][0]).toBe(1);
    expect(matrix.values?.[0][1]).toBe(2);
    expect(matrix.values?.[1][0]).toBe(3);
    expect(matrix.values?.[1][1]).toBe(4);
  });

  test('throws error for empty path', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    expect(() => Obj.setValue(person, [], 'value')).toThrow('Path must not be empty');
  });

  test('sets value with single-element path', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'John',
      username: 'john',
      email: 'john@example.com',
    });

    Obj.setValue(person, ['age'], 30);

    expect(person.age).toBe(30);
  });

  test('handles numeric keys as strings', ({ expect }) => {
    const Item = Schema.Struct({
      value: Schema.optional(Schema.Number),
    }).pipe(Schema.mutable);

    const Container = Schema.Struct({
      name: Schema.String,
      items: Schema.optional(Schema.mutable(Schema.Array(Item))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Container',
        version: '0.1.0',
      }),
    );

    const container = Obj.make(Container, { name: 'box' });

    // Using string '0' for array index.
    Obj.setValue(container, ['items', '0', 'value'], 42);

    expect(container.items?.[0].value).toBe(42);
  });

  test('handles array with object with required field', ({ expect }) => {
    // This test demonstrates the problematic scenario:
    // An array containing objects that have required fields.
    const Task = Schema.Struct({
      id: Schema.String, // Required field.
      title: Schema.optional(Schema.String),
      completed: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable);

    const TodoList = Schema.Struct({
      name: Schema.String,
      tasks: Schema.optional(Schema.mutable(Schema.Array(Task))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/TodoList',
        version: '0.1.0',
      }),
    );

    const todoList = Obj.make(TodoList, { name: 'My Tasks' });

    // This should work: setting a nested property on an array element.
    // The required 'id' field should be initialized with a default value.
    Obj.setValue(todoList, ['tasks', 0, 'title'], 'Buy groceries');

    expect(todoList.tasks?.[0].id).toBe(''); // Default value for required String
    expect(todoList.tasks?.[0].title).toBe('Buy groceries');
    expect(todoList.tasks?.[0].completed).toBeUndefined(); // Optional field not set
  });

  test('initializes multiple required primitive fields with defaults', ({ expect }) => {
    const Item = Schema.Struct({
      id: Schema.String, // Required - should default to ""
      count: Schema.Number, // Required - should default to 0
      active: Schema.Boolean, // Required - should default to false
      label: Schema.optional(Schema.String), // Optional - should not be initialized
    }).pipe(Schema.mutable);

    const Container = Schema.Struct({
      name: Schema.String,
      items: Schema.optional(Schema.mutable(Schema.Array(Item))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Container',
        version: '0.1.0',
      }),
    );

    const container = Obj.make(Container, { name: 'box' });

    Obj.setValue(container, ['items', 0, 'label'], 'First Item');

    // All required primitive fields should have default values.
    expect(container.items?.[0].id).toBe('');
    expect(container.items?.[0].count).toBe(0);
    expect(container.items?.[0].active).toBe(false);
    expect(container.items?.[0].label).toBe('First Item');
  });
});
