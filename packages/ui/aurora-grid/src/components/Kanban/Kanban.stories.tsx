//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicMoveEvent, MosaicContextProvider, MosaicDataItem, MosaicContainerProps } from '../../dnd';
import { ComplexCard, createItem, FullscreenDecorator } from '../../testing';
import { Stack } from '../Stack';

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
      items: Array.from({ length: 5 - i }).map(() => createItem(['document', 'image'])),
    }));
  });

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  const handleMoveItem = ({ container, active, over }: MosaicMoveEvent) => {
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
            <Column key={id} id={id} items={items} onMoveItem={handleMoveItem} />
          ))}
        </div>
      </div>
    </MosaicContextProvider>
  );
};

const Column: FC<{ id: string; items: MosaicDataItem[]; onMoveItem: MosaicContainerProps<any>['onMoveItem'] }> = ({
  id,
  items,
  onMoveItem,
}) => {
  return (
    <div className='flex flex-col w-[300px] overflow-hidden'>
      <div className='flex shrink-0 h-[40px] ring'>{id}</div>
      <Stack.Root id={id} items={items} Component={ComplexCard} onMoveItem={onMoveItem} debug />
    </div>
  );
};
