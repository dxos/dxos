//
// Copyright 2022 DXOS.org
//

import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import expect from 'expect';
import React from 'react';

import { Space, Client } from '@dxos/client';

import { useSelection } from './useSelection';

const count = 10;
const TYPE_EXAMPLE = 'example:type/org';

const createTestComponents = async () => {
  const config = {};
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile();

  const space = await client.echo.createSpace();
  const items = await Promise.all(
    Array.from({ length: count }).map(async () => await space.database.createItem({ type: TYPE_EXAMPLE }))
  );
  expect(items.length).toBe(count);

  return { client, space };
};

const UseSelectionTestComponent = ({ space }: { space: Space }) => {
  const items = useSelection(space?.select().filter({ type: TYPE_EXAMPLE }), []);

  const addItem = async () => await space.database.createItem({ type: TYPE_EXAMPLE });

  return (
    <ul data-testid='add' onClick={addItem}>
      {items?.map((item) => (
        <li key={item.id} data-testid='item'>
          {item.id}
        </li>
      ))}
    </ul>
  );
};

describe('useSelection', function () {
  it('gets updated items selection', async function () {
    const { space } = await createTestComponents();
    render(<UseSelectionTestComponent space={space} />);

    expect((await screen.findAllByTestId('item')).length).toEqual(count);
    await userEvent.click(screen.getByTestId('add'));
    await waitFor(() => screen.getAllByTestId('item').length === count + 1);
  });
});
