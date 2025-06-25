//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Expando, Filter, live } from '@dxos/client/echo';

import { useQuery } from './useQuery';
import { createClient, createClientContextProvider } from '../testing/util';

describe('useQuery', () => {
  test('reproduces deletion flash bug where deleted object moves to end before disappearing', async () => {
    // Setup: Create client and space.
    const { client, space } = await createClient({ createIdentity: true, createSpace: true });
    const wrapper = await createClientContextProvider(client);

    // Create 3 test objects: Alice, Bob, Charlie.
    const alice = live(Expando, { name: 'Alice' });
    const bob = live(Expando, { name: 'Bob' });
    const charlie = live(Expando, { name: 'Charlie' });

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

    expect(allRenders).toEqual([
      [], // Initial loading state.
      ['Alice', 'Bob', 'Charlie'], // All objects loaded.
      ['Alice', 'Charlie'], // Bob removed (no flash).
    ]);
  });
});
