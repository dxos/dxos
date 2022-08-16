//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import faker from 'faker';
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

import { sleep } from '@dxos/async';
import { Item, ObjectModel, OrderedList } from '@dxos/client';
import { Client } from '@dxos/client/client';
import { SubscriptionGroup } from '@dxos/util';

const createTestComponents = async () => {
  const config = {};
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile();

  const party = await client.echo.createParty();
  const items = await Promise.all(Array.from({ length: 3 }).map(async () => await party.database.createItem({
    model: ObjectModel,
    type: 'example:type/list-item',
    props: {
      name: faker.name.firstName()
    }
  })));

  return { client, party, items };
};

const Test = ({ items, orderedList }: {items: Item<ObjectModel>[], orderedList: OrderedList}) => {
  const subscriptions = useMemo(() => new SubscriptionGroup(), []);
  const [order, setOrder] = useState(orderedList.values);

  useEffect(() => {
    setOrder(() => orderedList.values);
    const unsuscribeOrderedListListener = orderedList.update.on(() => setOrder(orderedList.values));
    subscriptions.push(unsuscribeOrderedListListener);
    return () => subscriptions.unsubscribe();
  }, [orderedList]);

  const handleChangeOrder = async () => {
    const newOrder = [
      order[1],
      order[0],
      ...order.slice(2)
    ];
    await orderedList.init(newOrder);
  };

  return (
    <ul onClick={handleChangeOrder}>
      {order.map(id => (
        <li key={id}>
          {items.find(item => item.id === id)!.id}
        </li>
      ))}
    </ul>
  );
};

let rootContainer: HTMLDivElement | null;

beforeEach(() => {
  rootContainer = document.createElement('div');
  document.body.appendChild(rootContainer);
});

afterEach(() => {
  document.body.removeChild(rootContainer as HTMLDivElement);
  rootContainer = null;
});

describe('OrderedList', () => {
  it('reorders', async () => {
    const { party, items } = await createTestComponents();
    const list = await party.database.createItem({
      model: ObjectModel,
      type: 'example:type/list'
    });
    const orderedList = new OrderedList(list.model);
    await orderedList.init(items.map(item => item.id));

    act(() => {
      ReactDOM.render(<Test items={items} orderedList={orderedList} />, rootContainer);
    });

    const ul = document.querySelector('ul');
    expect(ul?.childElementCount).toEqual(3);
    ul?.childNodes.forEach((node, i) => {
      expect(node.textContent).toBe(orderedList.values[i]);
    });

    ul?.click();
    await sleep(100); // It does not render quick enough.
    ul?.childNodes.forEach((node, i) => {
      expect(node.textContent).toBe(orderedList.values[i]);
    });
  });
});
