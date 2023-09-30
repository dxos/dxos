//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Grid, GridItem } from './Grid';
import { Position } from './util';
import { SimpleCard, SimpleCardProps, createItem, FullscreenDecorator } from '../testing';

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
  const [items, setItems] = useState<GridItem<SimpleCardProps>[]>(() =>
    testItems.map((data) => ({
      id: data.id,
      data,
      position: testPositions.find((position) => position.id === data.id)?.position,
      Component: SimpleCard, // TODO(burdon): Factor out delegator.
    })),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setItems((items) =>
      items.map((item) => {
        if (item.id === event.active.id) {
          return {
            ...item,
            position: event.over?.data.current as Position,
          };
        }

        return item;
      }),
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Grid.Root items={items} size={size} />
    </DndContext>
  );
};
