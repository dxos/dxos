//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Grid, GridDataItem } from './Grid';
import { Position } from './util';
import { MosaicContextProvider, MosaicMoveEvent } from '../../dnd';
import { SimpleCard, SimpleCardProps, createItem, FullscreenDecorator, TestItem } from '../testing';

faker.seed(3);

const size = { x: 3, y: 3 };
const testItems = Array.from({ length: 5 }).map(() => createItem(['document', 'image']));
const testPositions = testItems.map((item) => ({
  id: item.id,
  position: { x: faker.number.int({ min: 0, max: size.x - 1 }), y: faker.number.int({ min: 0, max: size.y - 1 }) },
}));

export default {
  component: Grid.Root,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => {
  const [items, setItems] = useState<GridDataItem<SimpleCardProps>[]>(() =>
    testItems.map((data) => ({
      id: data.id,
      data,
      position: testPositions.find((position) => position.id === data.id)?.position,
      Component: SimpleCard, // TODO(burdon): Factor out delegator.
    })),
  );

  const handleMove = ({ active, over }: MosaicMoveEvent<TestItem, Position>) => {
    setItems((items) =>
      items.map((item) => {
        if (item.id === active.id) {
          return {
            ...item,
            position: over?.position as Position,
          };
        }

        return item;
      }),
    );
  };

  return (
    <MosaicContextProvider Component={SimpleCard} onMove={handleMove}>
      <Grid.Root id='test' items={items} size={size} render={SimpleCard} />
    </MosaicContextProvider>
  );
};
