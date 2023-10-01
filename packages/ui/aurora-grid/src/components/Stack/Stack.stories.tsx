//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Stack } from './Stack';
import { MosaicMoveEvent, MosaicContextProvider, MosaicDataItem } from '../../dnd';
import { createItem, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

export default {
  component: Stack,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => {
  const [items, setItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: 10 }).map(() => createItem(['document'])),
  );

  const handleMoveItem = ({ container, active, over }: MosaicMoveEvent<number>) => {
    // console.log('handleMoveStackItem', active.position);
    setItems((items) => {
      if (active.container === container) {
        items.splice(active.position!, 1);
      }
      if (over.container === container) {
        items.splice(over.position!, 0, active.item);
      }
      return [...items];
    });
  };

  // TODO(burdon): Draggable stacks.
  return (
    <MosaicContextProvider debug>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex'>
          <Stack.Root id={'stack'} items={items} Component={SimpleCard} onMoveItem={handleMoveItem} debug />
        </div>
      </div>
    </MosaicContextProvider>
  );
};
