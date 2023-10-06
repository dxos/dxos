//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { arrayMove } from '@dnd-kit/sortable';
import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { Tree, TreeData } from './Tree';
import { MosaicMoveEvent, Path, useSortedItems } from '../../dnd';
import { FullscreenDecorator, MosaicDecorator, createItem } from '../../testing';

faker.seed(3);

const count = 5;

const testItems1 = Array.from({ length: count }).map((_, i) => ({
  id: `branch-${i}`,
  label: `Branch ${i}`,
  children: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => {
    const item = createItem();

    return {
      id: item.id,
      label: item.title,
      children: [],
    };
  }),
}));

const testItems2 = [
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

const TreeStory = ({ id = 'tree', initialItems }: { id: string; initialItems: TreeData[] }) => {
  const [items, setItems] = useState(initialItems);
  const sortedItems = useSortedItems({ container: id, items });

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      if (active.container === id) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(active.container) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(over.container) === item.id) {
              children.splice(over.position!, 0, active.item as TreeData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  const handleDroppable = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    if (active.container === id && over.container !== id) {
      return false;
    }

    return true;
  }, []);

  return (
    <Tree.Root id={id} items={sortedItems} onDrop={handleDrop} isDroppable={handleDroppable}>
      {sortedItems.map((item, index) => (
        <Tree.Tile key={item.id} item={item} index={index} />
      ))}
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
