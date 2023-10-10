//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { arrayMove } from '@dnd-kit/sortable';
import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { Tree, TreeData } from './Tree';
import { Mosaic, MosaicMoveEvent, Path } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator } from '../../testing';

faker.seed(3);
const generator = new TestObjectGenerator({ types: ['document', 'image'] });

const count = 5;

// TODO(burdon): Move to testing.
const testItems1 = Array.from({ length: count }).map((_, i) => ({
  id: `branch-${i}`,
  label: `Branch ${i}`,
  children: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => {
    const item = generator.createObject();
    return {
      id: item.id,
      label: item.title, // TODO(burdon): Lens.
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

const TreeStory = ({ id = 'tree', initialItems, debug }: { id: string; initialItems: TreeData[]; debug?: boolean }) => {
  const [items, setItems] = useState(initialItems);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      if (active.path === id) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(active.path) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(over.path) === item.id) {
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
    return !(active.path === id && over.path !== id);
  }, []);

  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Tree id={id} items={items} onDrop={handleDrop} isDroppable={handleDroppable} />
    </Mosaic.Root>
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
};

export const Deep = {
  args: { initialItems: testItems2 },
  render: TreeStory,
};
