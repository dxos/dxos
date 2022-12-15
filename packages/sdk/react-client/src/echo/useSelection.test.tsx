//
// Copyright 2022 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

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
    expect(result.current.data?.length).to.eq(count);
  });

  test('gets items selection updates', async () => {
    const { result } = renderHook(() => useSelection(space.select({ type: TYPE_EXAMPLE })));
    const itemA = result.current.data?.[0];
    // TODO(wittjosiah): `act` is not working as expected.
    act(() => {
      void space.database.createItem({ type: TYPE_EXAMPLE });
    });
    await waitForExpect(() => {
      expect(result.current.data?.length).to.eq(count + 1);
    });
    const itemB = result.current.data?.[0];
    // Ensure items are referentially equal if they don't change.
    expect(itemA!.id).to.eq(itemB!.id);
    expect(itemA).to.eq(itemB);
    // TODO(wittjosiah): Ensure items are not referentially equal if a property changes?
  });
});
