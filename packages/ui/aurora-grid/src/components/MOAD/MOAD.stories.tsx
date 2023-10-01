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

faker.seed(3);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default: FC<PropsWithChildren> = ({ children }) => {
  //
  // Stack
  //
  const [stackItems, setStackItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: 5 }).map(() => createItem(['document', 'image'])),
  );
  const handleMoveStackItem = ({ active, over }: MosaicMoveEvent) => {
    setStackItems((items) => {
      items.splice(active.position, 1);
      items.splice(over.position, 0, active.item);
      return [...items];
    });
  };

  //
  // Grid
  //
  const [gridItems, setGridItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: 2 }).map(() => createItem(['document', 'image'])),
  );
  const [layout, setLayout] = useState<GridLayout>(() =>
    gridItems.reduce<GridLayout>((map, item, i) => {
      map[item.id] = { x: i, y: 0 };
      return map;
    }, {}),
  );
  const handleMoveGridItem = ({ active, over }: MosaicMoveEvent) => {
    if (gridItems.findIndex((item) => item.id === active.item.id) === -1) {
      setGridItems((items) => [active.item, ...items]);
    }

    setLayout((layout) => ({ ...layout, [active.item.id]: over.position }));
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
              size={{ x: 3, y: 3 }}
              debug
            />
          </div>
        </div>
      </div>
    </MosaicContextProvider>
  );
};
