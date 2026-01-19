//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import { AtomObj } from './atom';

describe('Echo Atom - Basic Functionality', () => {
  test('AtomObj.make creates atom for entire object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    const atomValue = registry.get(atom);
    expect(atomValue.value).toBe(obj);
    expect(atomValue.value.name).toBe('Test');
  });

  test('AtomObj.makeProperty creates atom for specific property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    const atomValue = registry.get(atom);
    expect(atomValue.value).toBe('Test');
  });

  test('AtomObj.makeProperty is type-safe', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    // This should compile and work.
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    expect(registry.get(nameAtom).value).toBe('Test');
    expect(registry.get(emailAtom).value).toBe('test@example.com');
  });

  test('atom updates when object is mutated directly', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Mutate object directly.
    obj.name = 'Updated';

    // Subscription should have fired: immediate + update.
    expect(updateCount).toBe(2);

    // Atom should reflect the change.
    expect(registry.get(atom).value).toBe('Updated');
    expect(obj.name).toBe('Updated');
  });

  test('property atom supports updater pattern via direct mutation', () => {
    const obj = createObject(
      Obj.make(TestSchema.Task, {
        title: 'Task',
      }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'title');

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Update through direct mutation.
    obj.title = (obj.title ?? '') + ' Updated';

    // Subscription should have fired: immediate + update.
    expect(updateCount).toBe(2);

    // Atom should reflect the change.
    expect(registry.get(atom).value).toBe('Task Updated');
    expect(obj.title).toBe('Task Updated');
  });
});
