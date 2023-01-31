//
// Copyright 2022 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { expect } from 'chai';

import { Space, Client, fromHost } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { useSelection } from './useSelection';

const count = 10;
const TYPE_EXAMPLE = 'example:type/org';

describe('useSelection', () => {
  let space: Space;

  beforeEach(async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createProfile();

    space = await client.echo.createSpace();
    await Promise.all(Array.from({ length: count }).map(() => space.database.createItem({ type: TYPE_EXAMPLE })));
  });

  test('gets items selection', () => {
    const { result } = renderHook(() => useSelection(space.select({ type: TYPE_EXAMPLE })));
    expect(result.current?.length).to.eq(count);
  });

  test('gets items selection updates', async () => {
    const selection = space.select({ type: TYPE_EXAMPLE }).exec();
    const { result } = renderHook(() => useSelection(selection));
    const listA = result.current;
    const itemA = result.current?.[0];

    await act(async () => {
      await space.database.createItem({ type: TYPE_EXAMPLE });
      // TODO(wittjosiah): Why does createItem fire 2 selection updates?
      await selection.update.waitForCount(2);
    });

    expect(result.current?.length).to.eq(count + 1);
    const listB = result.current;
    const itemB = result.current?.[0];

    // Ensure lists are no referentially equal after selection updates.
    expect(listA).to.not.eq(listB);

    // Ensure items are referentially equal if they don't change.
    expect(itemA!.id).to.eq(itemB!.id);
    expect(itemA).to.eq(itemB);
  });
});
