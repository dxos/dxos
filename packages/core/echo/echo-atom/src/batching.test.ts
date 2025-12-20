//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import { AtomObj } from './atom';

describe('Echo Atom - Batch Updates', () => {
  test('multiple updates to same object atom in batch fire single update', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    let updateCount = 0;
    AtomObj.subscribe(
      registry,
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update)
    const initialCount = updateCount;
    expect(initialCount).toBe(1); // Verify immediate update fired

    // Make multiple updates to the same atom in a batch
    Atom.batch(() => {
      AtomObj.update(registry, atom, (obj) => {
        obj.name = 'Updated1';
      });
      AtomObj.update(registry, atom, (obj) => {
        obj.email = 'updated@example.com';
      });
      AtomObj.update(registry, atom, (obj) => {
        obj.username = 'updated';
      });
    });

    // Should have fired once for initial + once for batched update (not once per update)
    expect(updateCount).toBe(2);

    // Verify final state
    const finalValue = AtomObj.get(registry, atom);
    expect(finalValue.name).toBe('Updated1');
    expect(finalValue.email).toBe('updated@example.com');
    expect(finalValue.username).toBe('updated');
  });

  test('multiple updates to same property atom in batch fire single update', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    let updateCount = 0;
    AtomObj.subscribe(
      registry,
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update)
    const initialCount = updateCount;
    expect(initialCount).toBe(1);

    // Make multiple updates to the same property atom in a batch
    Atom.batch(() => {
      AtomObj.updateProperty(registry, atom, 'Updated1');
      AtomObj.updateProperty(registry, atom, 'Updated2');
      AtomObj.updateProperty(registry, atom, 'Updated3');
    });

    // Should have fired once for initial + once for batched update (not once per update)
    expect(updateCount).toBe(2);

    // Verify final state
    expect(AtomObj.get(registry, atom)).toBe('Updated3');
  });
});
