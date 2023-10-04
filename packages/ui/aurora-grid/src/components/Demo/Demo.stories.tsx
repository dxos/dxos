//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicMoveEvent, MosaicDataItem, useSortedItems } from '../../dnd';
import { ComplexCard, createItem, FullscreenDecorator, MosaicDecorator, SimpleCard } from '../../testing';
import { Grid, GridLayout, Position } from '../Grid';
import { Stack } from '../Stack';

faker.seed(5);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const debug = false;
const types = ['document', 'image'];

export const Default = {
  render: () => {
    //
    // Stacks
    //

    const [stackItems1, setStackItems1] = useState<MosaicDataItem[]>(() =>
      Array.from({ length: 10 }).map(() => createItem(types)),
    );

    const sortedStackItems1 = useSortedItems({ container: 'stack-1', items: stackItems1 });

    const handleMoveStackItem1 = ({ container, active, over }: MosaicMoveEvent<number>) => {
      setStackItems1((items) => {
        if (active.container === container) {
          items.splice(active.position!, 1);
        }
        if (over.container === container) {
          items.splice(over.position!, 0, active.item);
        }
        return [...items];
      });
    };

    const [stackItems2, setStackItems2] = useState<MosaicDataItem[]>(() =>
      Array.from({ length: 5 }).map(() => createItem(types)),
    );

    const sortedStackItems2 = useSortedItems({ container: 'stack-2', items: stackItems2 });

    const handleMoveStackItem2 = ({ container, active, over }: MosaicMoveEvent<number>) => {
      setStackItems2((items) => {
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
          <Stack.Root id='stack-1' Component={SimpleCard} onDrop={handleMoveStackItem1} debug={debug}>
            <Stack.Viewport items={stackItems1}>
              <div className='flex flex-col overflow-y-scroll p-2'>
                <div className='flex flex-col gap-2'>
                  {sortedStackItems1.map((item, i) => (
                    <Stack.Tile key={item.id} item={item} index={i} />
                  ))}
                </div>
              </div>
            </Stack.Viewport>
          </Stack.Root>
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
          <Stack.Root id='stack-2' Component={ComplexCard} onDrop={handleMoveStackItem2} debug={debug}>
            <Stack.Viewport items={stackItems2}>
              <div className='flex flex-col overflow-y-scroll bg-black p-1'>
                <div className='flex flex-col gap-1'>
                  {sortedStackItems2.map((item, i) => (
                    <Stack.Tile key={item.id} item={item} index={i} />
                  ))}
                </div>
              </div>
            </Stack.Viewport>
          </Stack.Root>
        </div>
      </div>
    );
  },
  decorators: [MosaicDecorator],
};
