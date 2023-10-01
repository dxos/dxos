//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Card } from '@dxos/aurora';

import { Stack } from './Stack';
import { MosaicMoveEvent, MosaicContextProvider, MosaicDataItem } from '../../dnd';
import { createItem, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default: FC<PropsWithChildren> = ({ children }) => {
  const [columns, setColumns] = useState<{ id: string; items: MosaicDataItem[] }[]>(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: `stack-column-${i}`,
      items: Array.from({ length: 5 - i }).map(() => createItem(['document'])),
    }));
  });

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  const handleMove = ({ container, active, over }: MosaicMoveEvent) => {
    setColumns((columns) =>
      columns.map((column) => {
        const items = [...column.items];
        if (active.container === column.id && column.id === container) {
          items.splice(active.position, 1);
        }
        if (over.container === column.id && column.id === container) {
          items.splice(over.position, 0, active.item);
        }
        return { ...column, items };
      }),
    );
  };

  // TODO(burdon): Draggable stacks.
  return (
    <MosaicContextProvider debug>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex'>
          {columns.map(({ id, items }) => (
            <div key={id} className='flex w-[300px] overflow-hidden'>
              <Stack.Root id={id} items={items} Component={SimpleCard} onMoveItem={handleMove} debug />
            </div>
          ))}
        </div>
      </div>
    </MosaicContextProvider>
  );
};
