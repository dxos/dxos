//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Obj from '../../Obj';
import * as Type from '../../Type';

describe('Obj.setValue', () => {
  test('sets simple nested object property', ({ expect }) => {
    const Address = Schema.Struct({
      street: Schema.optional(Schema.String),
      city: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const Person = Schema.Struct({
      name: Schema.String,
      address: Schema.optional(Schema.mutable(Address)),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    Obj.setValue(person, ['address', 'street'], '123 Main St');

    expect(person.address).toBeDefined();
    expect(person.address?.street).toBe('123 Main St');
  });

  test('sets array element by initializing array', ({ expect }) => {
    const Address = Schema.Struct({
      street: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const Person = Schema.Struct({
      name: Schema.String,
      addresses: Schema.optional(Schema.mutable(Schema.Array(Address))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    Obj.setValue(person, ['addresses', 0, 'street'], '123 Main St');

    expect(Array.isArray(person.addresses)).toBe(true);
    expect(person.addresses?.[0].street).toBe('123 Main St');
  });

  test('sets deeply nested array in object', ({ expect }) => {
    const Tag = Schema.Struct({
      name: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const Person = Schema.Struct({
      name: Schema.String,
      metadata: Schema.optional(
        Schema.mutable(
          Schema.Struct({
            tags: Schema.optional(Schema.mutable(Schema.Array(Tag))),
          }),
        ),
      ),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    Obj.setValue(person, ['metadata', 'tags', 0, 'name'], 'important');

    expect(person.metadata).toBeDefined();
    expect(Array.isArray(person.metadata?.tags)).toBe(true);
    expect(person.metadata?.tags?.[0].name).toBe('important');
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
    const Person = Schema.Struct({
      name: Schema.String,
      nickname: Schema.optional(Schema.String),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    Obj.setValue(person, ['nickname'], 'Johnny');

    expect(person.nickname).toBe('Johnny');
  });

  test('handles nested optional objects', ({ expect }) => {
    const Address = Schema.Struct({
      street: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const Person = Schema.Struct({
      name: Schema.String,
      address: Schema.optional(Schema.mutable(Address)),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    Obj.setValue(person, ['address', 'street'], '123 Main St');

    expect(person.address).toBeDefined();
    expect(person.address?.street).toBe('123 Main St');
  });

  test('returns the set value', ({ expect }) => {
    const Person = Schema.Struct({
      name: Schema.String,
      age: Schema.optional(Schema.Number),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    const result = Obj.setValue(person, ['age'], 30);

    expect(result).toBe(30);
  });

  test('overwrites existing values', ({ expect }) => {
    const Person = Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John', age: 25 });

    Obj.setValue(person, ['age'], 30);

    expect(person.age).toBe(30);
  });

  test('sets nested value in existing object', ({ expect }) => {
    const Address = Schema.Struct({
      street: Schema.String,
      city: Schema.String,
    }).pipe(Schema.mutable);

    const Person = Schema.Struct({
      name: Schema.String,
      address: Schema.mutable(Address),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, {
      name: 'John',
      address: { street: 'Old St', city: 'NYC' },
    });

    Obj.setValue(person, ['address', 'street'], '123 Main St');

    expect(person.address.street).toBe('123 Main St');
    expect(person.address.city).toBe('NYC');
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
    const Person = Schema.Struct({
      name: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

    expect(() => Obj.setValue(person, [], 'value')).toThrow('Path must not be empty');
  });

  test('sets value with single-element path', ({ expect }) => {
    const Person = Schema.Struct({
      name: Schema.String,
      age: Schema.optional(Schema.Number),
    }).pipe(
      Type.Obj({
        typename: 'test.com/Person',
        version: '0.1.0',
      }),
    );

    const person = Obj.make(Person, { name: 'John' });

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
      id: Schema.String, // REQUIRED field
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

  test('allows setting required field after initialization with default', ({ expect }) => {
    const Task = Schema.Struct({
      id: Schema.String, // Required
      title: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const TodoList = Schema.Struct({
      tasks: Schema.optional(Schema.mutable(Schema.Array(Task))),
    }).pipe(
      Type.Obj({
        typename: 'test.com/TodoList',
        version: '0.1.0',
      }),
    );

    const todoList = Obj.make(TodoList, {});

    // First set creates the object with default id: "".
    Obj.setValue(todoList, ['tasks', 0, 'title'], 'Buy groceries');
    expect(todoList.tasks?.[0].id).toBe('');

    // Now update the id to a real value.
    Obj.setValue(todoList, ['tasks', 0, 'id'], 'task-123');
    expect(todoList.tasks?.[0].id).toBe('task-123');
    expect(todoList.tasks?.[0].title).toBe('Buy groceries');
  });
});
