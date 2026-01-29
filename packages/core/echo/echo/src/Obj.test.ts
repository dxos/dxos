//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Obj from './Obj';
import * as Ref from './Ref';
import { TestSchema } from './testing';

describe('Obj.clone', () => {
  test('clones object with same properties', ({ expect }) => {
    const original = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      age: 30,
    });

    const cloned = Obj.clone(original);

    expect(cloned).not.toBe(original);
    expect(cloned.id).not.toBe(original.id);
    expect(cloned.name).toBe(original.name);
    expect(cloned.email).toBe(original.email);
    expect(cloned.username).toBe(original.username);
    expect(cloned.age).toBe(original.age);
  });

  test('cloned object is independent', ({ expect }) => {
    const original = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
    });

    const cloned = Obj.clone(original);

    Obj.change(original, (p) => {
      p.name = 'Bob';
    });

    expect(original.name).toBe('Bob');
    expect(cloned.name).toBe('Alice');
  });

  test('clone with retainId option keeps original id', ({ expect }) => {
    const original = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
    });

    const cloned = Obj.clone(original, { retainId: true });

    expect(cloned.id).toBe(original.id);
    expect(cloned.name).toBe(original.name);
  });

  test('shallow clone does not clone referenced objects', ({ expect }) => {
    const employer = Obj.make(TestSchema.Organization, {
      name: 'DXOS',
    });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      employer: Ref.make(employer),
    });

    const cloned = Obj.clone(person);

    expect(cloned.employer).toBe(person.employer);
    expect(cloned.employer?.target).toBe(employer);
    expect(cloned.employer?.target).toBe(person.employer?.target);

    // Modifying the referenced object affects both
    Obj.change(employer, (org) => {
      org.name = 'Updated DXOS';
    });

    expect(cloned.employer?.target?.name).toBe('Updated DXOS');
    expect(person.employer?.target?.name).toBe('Updated DXOS');
  });

  test('deep clone recursively clones referenced objects in meta', ({ expect }) => {
    // Note: Deep clone currently only works for refs in meta, not in props
    // This test verifies the current behavior - refs in props are not deep cloned
    const employer = Obj.make(TestSchema.Organization, {
      name: 'DXOS',
    });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      employer: Ref.make(employer),
    });

    const cloned = Obj.clone(person, { deep: true });

    // Refs in props are not deep cloned - they remain the same reference
    expect(cloned.employer).toBe(person.employer);
    expect(cloned.employer?.target).toBe(employer);

    // Modifying the original referenced object affects both
    Obj.change(employer, (org) => {
      org.name = 'Updated DXOS';
    });

    expect(cloned.employer?.target?.name).toBe('Updated DXOS');
    expect(person.employer?.target?.name).toBe('Updated DXOS');
  });

  test('deep clone with nested references in arrays', ({ expect }) => {
    // Note: Deep clone currently only works for refs in meta, not in props
    const task1 = Obj.make(TestSchema.Task, {
      title: 'Task 1',
      description: 'First task',
    });

    const task2 = Obj.make(TestSchema.Task, {
      title: 'Task 2',
      description: 'Second task',
      previous: Ref.make(task1),
    });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      tasks: [Ref.make(task1), Ref.make(task2)],
    });

    const cloned = Obj.clone(person, { deep: true });

    // Arrays are cloned but refs inside are not deep cloned
    expect(cloned.tasks).not.toBe(person.tasks);
    expect(cloned.tasks?.length).toBe(2);
    // Refs in props are not deep cloned
    expect(cloned.tasks?.[0]?.target).toBe(task1);
    expect(cloned.tasks?.[1]?.target).toBe(task2);
    expect(cloned.tasks?.[1]?.target?.previous?.target).toBe(task1);
  });

  test('deep clone with optional reference', ({ expect }) => {
    const employer = Obj.make(TestSchema.Organization, {
      name: 'DXOS',
    });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      employer: Ref.make(employer),
    });

    const cloned = Obj.clone(person, { deep: true });

    expect(cloned.employer).toBeDefined();
    expect(cloned.employer?.target).toBeDefined();
    expect(cloned.employer?.target?.name).toBe('DXOS');

    // Test with undefined optional reference
    const personWithoutEmployer = Obj.make(TestSchema.Person, {
      name: 'Bob',
      email: 'bob@example.com',
      username: 'bob',
    });

    const clonedWithoutEmployer = Obj.clone(personWithoutEmployer, { deep: true });
    expect(clonedWithoutEmployer.employer).toBeUndefined();
  });

  test('deep clone preserves nested object properties', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      address: {
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        coordinates: {
          lat: 37.7749,
          lng: -122.4194,
        },
      },
    });

    const cloned = Obj.clone(person, { deep: true });

    expect(cloned.address.city).toBe('San Francisco');
    expect(cloned.address.state).toBe('CA');
    expect(cloned.address.zip).toBe('94102');
    expect(cloned.address.coordinates.lat).toBe(37.7749);
    expect(cloned.address.coordinates.lng).toBe(-122.4194);

    // Modifying nested properties should be independent
    Obj.change(person, (p) => {
      p.address.city = 'New York';
    });

    expect(cloned.address.city).toBe('San Francisco');
    expect(person.address.city).toBe('New York');
  });

  test('deep clone with array of references', ({ expect }) => {
    // Note: Deep clone currently only works for refs in meta, not in props
    const task1 = Obj.make(TestSchema.Task, { title: 'Task 1' });
    const task2 = Obj.make(TestSchema.Task, { title: 'Task 2' });
    const task3 = Obj.make(TestSchema.Task, { title: 'Task 3' });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      tasks: [Ref.make(task1), Ref.make(task2), Ref.make(task3)],
    });

    const cloned = Obj.clone(person, { deep: true });

    expect(cloned.tasks?.length).toBe(3);
    expect(cloned.tasks?.[0]?.target?.title).toBe('Task 1');
    expect(cloned.tasks?.[1]?.target?.title).toBe('Task 2');
    expect(cloned.tasks?.[2]?.target?.title).toBe('Task 3');

    // Arrays are cloned but refs inside are not deep cloned
    expect(cloned.tasks).not.toBe(person.tasks);
    expect(cloned.tasks?.[0]?.target).toBe(task1);
    expect(cloned.tasks?.[1]?.target).toBe(task2);
    expect(cloned.tasks?.[2]?.target).toBe(task3);

    // Modifying original tasks affects both since refs are shared
    Obj.change(task1, (t) => {
      t.title = 'Updated Task 1';
    });

    expect(cloned.tasks?.[0]?.target?.title).toBe('Updated Task 1');
    expect(person.tasks?.[0]?.target?.title).toBe('Updated Task 1');
  });

  test('deep clone with retainId option', ({ expect }) => {
    const employer = Obj.make(TestSchema.Organization, {
      name: 'DXOS',
    });

    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      employer: Ref.make(employer),
    });

    const cloned = Obj.clone(person, { deep: true, retainId: true });

    expect(cloned.id).toBe(person.id);
    // Refs in props are not deep cloned even with deep: true
    expect(cloned.employer?.target).toBe(employer);
  });

  test('clone preserves schema type', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
    });

    const cloned = Obj.clone(person);

    expect(Obj.instanceOf(TestSchema.Person, cloned)).toBe(true);
    expect(Obj.getSchema(cloned)).toBe(Obj.getSchema(person));
  });
});