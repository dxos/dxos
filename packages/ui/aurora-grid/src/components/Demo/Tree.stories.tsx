//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { arrayMove } from '@dnd-kit/sortable';
import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicMoveEvent, MosaicDataItem, useSortedItems } from '../../dnd';
import { ComplexCard, createItem, FullscreenDecorator, MosaicDecorator } from '../../testing';
import { Grid, GridLayout, Position } from '../Grid';
import { Stack } from '../Stack';
import { Tree, TreeData } from '../Tree';

faker.seed(5);

export default {
  title: 'Demo',
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const debug = false;
const types = ['document', 'image'];

export const WithTree = {
  render: () => {
    //
    // Tree
    //

    const [treeItems, setTreeItems] = useState<TreeData[]>(() =>
      Array.from({ length: 4 }).map(() => ({
        ...createItem(types),
        level: 0,
        items: Array.from({ length: 3 }).map(() => ({
          ...createItem(types),
          level: 1,
          items: [],
        })),
      })),
    );

    const sortedTreeItems = useSortedItems({ container: 'tree', items: treeItems });

    const handleMoveTreeItem = ({ container, active, over }: MosaicMoveEvent<number>) => {
      if (container === 'tree') {
        setTreeItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setTreeItems((items) =>
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
    };

    //
    // Stack
    //

    const [stackItems, setStackItems] = useState<MosaicDataItem[]>(() =>
      Array.from({ length: 5 }).map(() => createItem(types)),
    );

    const sortedStackItems = useSortedItems({ container: 'stack', items: stackItems });

    const handleMoveStackItem = ({ container, active, over }: MosaicMoveEvent<number>) => {
      setStackItems((items) => {
        if (active.container === container) {
          items.splice(active.position!, 1);
        }
        if (over.container === container) {
          items.splice(over.position!, 0, active.item);
        }
        return [...items];
      });
    };

    //
    // Grid
    //

    const size = { x: 4, y: 4 };
    const [gridItems, setGridItems] = useState<MosaicDataItem[]>(() =>
      Array.from({ length: 6 }).map(() => createItem(types)),
    );
    const [layout, setLayout] = useState<GridLayout>(() =>
      gridItems.reduce<GridLayout>((map, item, i) => {
        map[item.id] = {
          x: faker.number.int({ min: 0, max: size.x - 1 }),
          y: faker.number.int({ min: 0, max: size.y - 1 }),
        };
        return map;
      }, {}),
    );

    const handleMoveGridItem = ({ container, active, over }: MosaicMoveEvent<Position>) => {
      if (over.container !== container) {
        setGridItems((items) => items.filter((item) => item.id !== active.item.id));
      } else {
        setGridItems((items) => {
          if (items.findIndex((item) => item.id === active.item.id) === -1) {
            return [active.item, ...items];
          } else {
            return items;
          }
        });

        setLayout((layout) => ({ ...layout, [active.item.id]: over.position! }));
      }
    };

    return (
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <Tree.Root id='stack-1' items={sortedTreeItems.map(({ id }) => id)} onDrop={handleMoveTreeItem} debug={debug}>
            <div className='flex flex-col'>
              {sortedTreeItems.map((item, i) => (
                <Tree.Tile key={item.id} item={item} index={i} />
              ))}
            </div>
          </Tree.Root>
        </div>
        <div className='flex grow overflow-hidden'>
          <Grid.Root
            id='grid'
            items={gridItems}
            layout={layout}
            size={size}
            Component={ComplexCard}
            onDrop={handleMoveGridItem}
            debug={debug}
            className='p-4'
          />
        </div>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <Stack.Root
            id='stack-2'
            items={sortedStackItems.map(({ id }) => id)}
            Component={ComplexCard}
            onDrop={handleMoveStackItem}
            debug={debug}
          >
            <div className='flex flex-col overflow-y-scroll bg-black p-1'>
              <div className='flex flex-col gap-1'>
                {sortedStackItems.map((item, i) => (
                  <Stack.Tile key={item.id} item={item} index={i} />
                ))}
              </div>
            </div>
          </Stack.Root>
        </div>
      </div>
    );
  },
  decorators: [MosaicDecorator],
};
