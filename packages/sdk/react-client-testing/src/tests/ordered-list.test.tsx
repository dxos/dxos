//
// Copyright 2022 DXOS.org
//

import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import expect from 'expect';
import faker from 'faker';
import React, { useEffect, useMemo, useState } from 'react';

import { EventSubscriptions } from '@dxos/async';
import {
  defaultTestingConfig,
  Item,
  ObjectModel,
  OrderedList,
  Client
} from '@dxos/client';

const createTestComponents = async () => {
  const client = new Client(defaultTestingConfig);
  await client.initialize();
  await client.halo.createProfile();

  const party = await client.echo.createParty();
  const items = await Promise.all(
    Array.from({ length: 3 }).map(
      async () =>
        await party.database.createItem({
          model: ObjectModel,
          type: 'example:type/list-item',
          props: {
            name: faker.name.firstName()
          }
        })
    )
  );

  return { client, party, items };
};

const Test = ({
  items,
  orderedList
}: {
  items: Item<ObjectModel>[];
  orderedList: OrderedList;
}) => {
  const subscriptions = useMemo(() => new EventSubscriptions(), []);
  const [order, setOrder] = useState(orderedList.values);

  useEffect(() => {
    setOrder(() => orderedList.values);
    const unsuscribeOrderedListListener = orderedList.update.on(() =>
      setOrder(orderedList.values)
    );
    subscriptions.add(unsuscribeOrderedListListener);
    return () => subscriptions.clear();
  }, [orderedList]);

  const handleChangeOrder = async () => {
    const newOrder = [order[1], order[0], ...order.slice(2)];
    await orderedList.init(newOrder);
  };

  return (
    <ul data-testid='click' onClick={handleChangeOrder}>
      {order.map((id) => (
        <li data-testid='item' key={id}>
          {items.find((item) => item.id === id)!.id}
        </li>
      ))}
    </ul>
  );
};

describe('OrderedList', function () {
  it('reorders', async function () {
    const { party, items } = await createTestComponents();
    const list = await party.database.createItem({
      model: ObjectModel,
      type: 'example:type/list'
    });
    const orderedList = new OrderedList(list.model);
    await orderedList.init(items.map((item) => item.id));

    render(<Test items={items} orderedList={orderedList} />);

    expect((await screen.findAllByTestId('item')).length).toEqual(3);
    screen.getAllByTestId('item').forEach((node, i) => {
      expect(node.textContent).toBe(orderedList.values[i]);
    });

    await userEvent.click(screen.getByTestId('click'));
    await waitFor(() => {
      screen.getAllByTestId('item').forEach((node, i) => {
        expect(node.textContent).toBe(orderedList.values[i]);
      });
    });
  });
});
