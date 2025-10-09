//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Expando, Filter, live } from '@dxos/client/echo';

import { createClient, createClientContextProvider } from '../testing/util';

import { useQuery } from './useQuery';
import { Obj, Type } from '@dxos/echo';

describe('useQuery', () => {
  // TODO(dmaretskyi): Fix this test.
  test.skip('deleting an element should result in correct render sequence', async () => {
    // Setup: Create client and space.
    const { client, space } = await createClient({ createIdentity: true, createSpace: true });
    const wrapper = await createClientContextProvider(client);

    // Create 3 test objects: Alice, Bob, Charlie.
    const alice = Obj.make(Type.Expando, { name: 'Alice' });
    const bob = Obj.make(Type.Expando, { name: 'Bob' });
    const charlie = Obj.make(Type.Expando, { name: 'Charlie' });

    space!.db.add(alice);
    space!.db.add(bob);
    space!.db.add(charlie);
    await space!.db.flush();

    // Track all renders to observe the bug.
    const allRenders: string[][] = [];

    // Setup useQuery hook that captures every render.
    renderHook(
      () => {
        const objects = useQuery(space, Filter.type(Expando));

        // Capture the names in this render.
        const namesInThisRender = objects.map((obj) => obj.name);
        allRenders.push([...namesInThisRender]);

        return objects;
      },
      { wrapper },
    );

    // Wait for initial renders to complete.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // THE BUG REPRODUCTION: Delete Bob.
    space!.db.remove(bob);

    // Wait for all reactive updates to complete.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO(ZaymonFC): Remove this comment once the flash bug is resolved.
    /*
     * NOTE(ZaymonFC):
     *   Expected: 3 renders
     *   1. [] (empty)
     *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
     *   3. ['Alice', 'Charlie'] (Bob removed, no flash)
     *
     *   Actual: 4 renders
     *   1. [] (empty)
     *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
     *   3. ['Alice', 'Charlie', 'Bob'] (FLASH BUG - Bob moves to end!)
     *   4. ['Alice', 'Charlie'] (Bob finally removed)
     */

    expect(allRenders).toEqual([
      [], // Initial loading state.
      ['Alice', 'Bob', 'Charlie'], // All objects loaded.
      ['Alice', 'Charlie'], // Bob removed (no flash).
    ]);
  });

  test('bulk deleting multiple items should remove them from query results', async () => {
    // Setup: Create client and space.
    const { client, space } = await createClient({ createIdentity: true, createSpace: true });
    const wrapper = await createClientContextProvider(client);

    // Create 10 test objects: 1, 2, 3, ..., 10.
    const objects = Array.from({ length: 10 }, (_, i) => Obj.make(Type.Expando, { value: i + 1 }));

    objects.forEach((obj) => space!.db.add(obj));
    await space!.db.flush();

    // Track all renders to observe the bug.
    const allRenders: number[][] = [];

    // Setup useQuery hook that captures every render.
    renderHook(
      () => {
        const queryObjects = useQuery(space, Filter.type(Expando));

        // Capture the values in this render.
        const valuesInThisRender = queryObjects.map((obj) => obj.value);
        allRenders.push([...valuesInThisRender]);

        return queryObjects;
      },
      { wrapper },
    );

    // Wait for initial renders to complete.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // THE BUG REPRODUCTION: Delete all items in a loop.
    for (const item of objects) {
      space!.db.remove(item);
    }

    // Wait for all reactive updates to complete.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Convert to sets for order-independent comparison.
    const renderSets = allRenders.map((render) => new Set(render));

    expect(renderSets).toEqual([
      new Set([]), // Initial loading state.
      new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), // All objects loaded.
      // TODO(dmaretskyi): Fix this with query ordering.
      new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), // Getting another render for some reason.
      new Set([]), // All items deleted.
    ]);
  });
});
