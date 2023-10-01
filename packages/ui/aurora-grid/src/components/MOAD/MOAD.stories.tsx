//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicMoveEvent, MosaicContextProvider, MosaicDataItem } from '../../dnd';
import { Grid, GridLayout } from '../Grid';
import { Stack } from '../Stack';
import { ComplexCard, createItem, FullscreenDecorator, SimpleCard } from '../testing';

faker.seed(10);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const types = ['document', 'image'];

export const Default: FC<PropsWithChildren> = ({ children }) => {
  //
  // Stack
  //
  const [stackItems, setStackItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: 5 }).map(() => createItem(types)),
  );
  const handleMoveStackItem = ({ container, active, over }: MosaicMoveEvent) => {
    // console.log('handleMoveStackItem', active.position);
    setStackItems((items) => {
      // TODO(burdon): Make sure each column is a container.
      if (active.container === container) {
        items.splice(active.position, 1);
      }

      if (over.container === container) {
        items.splice(over.position, 0, active.item);
      }
      return [...items];
    });
  };

  //
  // Grid
  //
  const size = { x: 4, y: 3 };
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
  const handleMoveGridItem = ({ container, active, over }: MosaicMoveEvent) => {
    // console.log('handleMoveGridItem', active, over);
    if (over.container !== container) {
      // TODO(burdon): Get id from event.
      setGridItems((items) => items.filter((item) => item.id !== active.item.id));
    } else {
      setGridItems((items) => {
        if (items.findIndex((item) => item.id === active.item.id) === -1) {
          return [active.item, ...items];
        } else {
          return items;
        }
      });

      setLayout((layout) => ({ ...layout, [active.item.id]: over.position }));
    }
  };

  return (
    <MosaicContextProvider debug>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex gap-4 divide-x'>
          <div className='flex w-[300px] overflow-hidden'>
            <Stack.Root id='stack' items={stackItems} Component={SimpleCard} onMoveItem={handleMoveStackItem} debug />
          </div>
          <div className='flex grow'>
            <Grid.Root
              id='grid'
              items={gridItems}
              layout={layout}
              Component={ComplexCard}
              onMoveItem={handleMoveGridItem}
              size={size}
              debug
            />
          </div>
        </div>
      </div>
    </MosaicContextProvider>
  );
};
