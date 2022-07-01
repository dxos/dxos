//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import faker from 'faker';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { Client, Item } from '@dxos/client';
import { ObjectModel, OrderedList } from '@dxos/object-model';

const useTestComponents = async () => {
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
  const [order, setOrder] = useState(orderedList.values);

  const handleChangeOrder = async () => {
    console.log(order);
    const newOrder = [
      order[1],
      order[0],
      ...order.slice(2)
    ];
    console.log(newOrder);
    await orderedList.init(newOrder);
    setOrder(newOrder);
  };

  return (
    <ul onClick={handleChangeOrder}>
      {order.map(id => (
        <li key={id}>
          {items.find(item => item.id === id)!.model.get('name')}
        </li>
      ))}
    </ul>
  );
};

let rootContainer: any;

beforeEach(() => {
  rootContainer = document.createElement('div');
  document.body.appendChild(rootContainer);
});

afterEach(() => {
  document.body.removeChild(rootContainer);
  rootContainer = null;
});

describe.only('OrderedList', () => {
  it('reorders.', async () => {
    const { party, items } = await useTestComponents();
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
    ul?.childNodes.forEach(node => console.log(node.textContent));
    ul?.click();
    await sleep(100);
    await waitForExpect(() => {
      expect(ul?.childElementCount).toEqual(3);
      ul?.childNodes.forEach(node => console.log(node.textContent));
    });
  });
});
