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

    const value = AtomObj.get(registry, atom);
    expect(value).toBe(obj);
    expect(value.name).toBe('Test');
  });

  test('AtomObj.makeProperty creates atom for specific property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    const value = AtomObj.get(registry, atom);
    expect(value).toBe('Test');
  });

  test('AtomObj.makeProperty is type-safe', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    // This should compile and work
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    expect(AtomObj.get(registry, nameAtom)).toBe('Test');
    expect(AtomObj.get(registry, emailAtom)).toBe('test@example.com');
  });

  test('atoms can be updated through update function', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    // Register atom (get() registers but doesn't subscribe)
    AtomObj.get(registry, atom);

    // Subscribe to registry directly (not through AtomObj.subscribe which sets up Echo subscription)
    let updateCount = 0;
    registry.subscribe(atom, () => {
      updateCount++;
    });

    // Update through update function
    AtomObj.updateProperty(registry, atom, 'Updated');

    // Subscription should have fired exactly once (from registry.set in updateProperty)
    expect(updateCount).toBe(1);

    // Atom should reflect the change
    expect(AtomObj.get(registry, atom)).toBe('Updated');
    expect(obj.name).toBe('Updated');
  });

  test('atoms support updater function', () => {
    const obj = createObject(
      Obj.make(TestSchema.Task, {
        title: 'Task',
      }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'title');

    // Register atom (get() registers but doesn't subscribe)
    AtomObj.get(registry, atom);

    // Subscribe to registry directly (not through AtomObj.subscribe which sets up Echo subscription)
    let updateCount = 0;
    registry.subscribe(atom, () => {
      updateCount++;
    });

    // Update through updater function
    AtomObj.updateProperty(registry, atom, (current: string | undefined) => (current ?? '') + ' Updated');

    // Subscription should have fired exactly once (from registry.set in updateProperty)
    expect(updateCount).toBe(1);

    // Atom should reflect the change
    expect(AtomObj.get(registry, atom)).toBe('Task Updated');
    expect(obj.title).toBe('Task Updated');
  });
});
