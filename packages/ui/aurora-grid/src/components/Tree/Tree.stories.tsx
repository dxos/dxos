//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Tree } from './Tree';
import { useSortedItems } from '../../dnd';
import { FullscreenDecorator, MosaicDecorator } from '../../testing';

faker.seed(3);

const testItems = [
  {
    id: 'Home',
    children: [],
  },
  {
    id: 'Collections',
    children: [
      { id: 'Spring', children: [] },
      { id: 'Summer', children: [] },
      { id: 'Fall', children: [] },
      { id: 'Winter', children: [] },
    ],
  },
  {
    id: 'About Us',
    children: [],
  },
  {
    id: 'My Account',
    children: [
      { id: 'Addresses', children: [] },
      {
        id: 'Order History',
        children: [
          { id: 'Order 1', children: [] },
          { id: 'Order 2', children: [] },
          { id: 'Order 3', children: [] },
        ],
      },
      { id: 'Payment Methods', children: [] },
      { id: 'Account Details', children: [] },
    ],
  },
];

export default {
  component: Tree,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => {
    const sortedItems = useSortedItems({ container: 'tree', items: testItems });

    return (
      <Tree.Root id='tree' items={sortedItems.map(({ id }) => id)} onMoveItem={console.log}>
        <div className='flex flex-col'>
          {sortedItems.map((item, i) => (
            <Tree.Tile key={item.id} item={item} index={i} />
          ))}
        </div>
      </Tree.Root>
    );
  },
  decorators: [MosaicDecorator],
};
