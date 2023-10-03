//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { arrayMove } from '@dnd-kit/sortable';
import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { Tree, TreeData } from './Tree';
import { MosaicMoveEvent, useSortedItems } from '../../dnd';
import { FullscreenDecorator, MosaicDecorator, createItem } from '../../testing';

faker.seed(3);

const id = 'tree';
const count = 5;

const testItems1 = Array.from({ length: count }).map((_, i) => ({
  id: `${id}/column/${i}`,
  title: `Column ${i}`,
  level: 0,
  items: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => ({
    ...createItem(['document']),
    level: 1,
    items: [],
  })),
}));

const testItems2 = [
  {
    id: 'Home',
    items: [],
  },
  {
    id: 'Collections',
    items: [
      { id: 'Spring', items: [] },
      { id: 'Summer', items: [] },
      { id: 'Fall', items: [] },
      { id: 'Winter', items: [] },
    ],
  },
  {
    id: 'About Us',
    items: [],
  },
  {
    id: 'My Account',
    items: [
      { id: 'Addresses', items: [] },
      {
        id: 'Order History',
        items: [
          { id: 'Order 1', items: [] },
          { id: 'Order 2', items: [] },
          { id: 'Order 3', items: [] },
        ],
      },
      { id: 'Payment Methods', items: [] },
      { id: 'Account Details', items: [] },
    ],
  },
];

const TreeStory = ({ initialItems }: { initialItems: TreeData[] }) => {
  const [items, setItems] = useState(initialItems);
  const sortedItems = useSortedItems({
    container: 'tree',
    items,
    isDroppable: (active) => (active.item as TreeData).level === 0,
  });

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ container, active, over }: MosaicMoveEvent<number>) => {
      if (container === 'tree') {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.items];
            if (active.container === container && container === item.id) {
              children.splice(active.position!, 1);
            }
            if (over.container === container && container === item.id) {
              children.splice(over.position!, 0, active.item as TreeData);
            }
            return { ...item, items: children };
          }),
        );
      }
    },
    [items],
  );

  return (
    <Tree.Root id={id} items={sortedItems.map(({ id }) => id)} onDrop={handleDrop}>
      <div className='flex flex-col'>
        {sortedItems.map((item, i) => (
          <Tree.Tile key={item.id} item={item} index={i} />
        ))}
      </div>
    </Tree.Root>
  );
};

export default {
  component: Tree,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: { initialItems: testItems1, debug: true },
  render: TreeStory,
  decorators: [MosaicDecorator],
};

export const Deep = {
  args: { initialItems: testItems2 },
  render: TreeStory,
  decorators: [MosaicDecorator],
};
