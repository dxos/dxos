//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Card } from '@dxos/aurora';

import { Stack, StackDataItem } from './Stack';
import { MosaicMoveEvent, MosaicContextProvider } from '../../dnd';
import { createItem, FullscreenDecorator, SimpleCard, SimpleCardProps } from '../testing';

faker.seed(3);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default: FC<PropsWithChildren> = ({ children }) => {
  const [rows, setRows] = useState<{ id: string; items: StackDataItem<SimpleCardProps>[] }[]>(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: `stack-column-${i}`,
      items: Array.from({ length: 5 - i })
        .map(() => createItem(['document']))
        .map((item) => ({ id: item.id, data: item, Component: SimpleCard })),
    }));
  });

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  const handleMove = ({ active, over }: MosaicMoveEvent) => {
    console.log(active, over);
    if (active.item.id !== over?.item.id) {
      setRows((rows) =>
        rows.map((row) => {
          const items = [...row.items];
          if (row.id === active.parent) {
            const activeIndex = row.items.findIndex((item) => item.id === active.item.id);
            if (activeIndex !== -1) {
              items.splice(activeIndex, 1);
            } else {
              console.warn('NO active index', { active, row });
            }
          }

          if (row.id === over.parent) {
            const overIndex = row.items.findIndex((item) => item.id === over.item.id);
            if (overIndex !== -1) {
              items.splice(overIndex + 1, 0, active.item as any);
            } else {
              console.warn('NO over index');
            }
          }

          return { ...row, items };
        }),
      );
    }
  };

  // TODO(burdon): Select/delete.
  // TODO(burdon): Provide handles for DnD rather than wrapping it?
  // TODO(burdon): Secondary stack?
  return (
    <MosaicContextProvider Component={SimpleCard} onMove={handleMove}>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex'>
          {rows.map(({ id, items }) => (
            <div key={id} className='flex w-[300px] overflow-hidden'>
              <Stack.Root id={id} items={items} Component={SimpleCard} />
            </div>
          ))}
        </div>
      </div>
    </MosaicContextProvider>
  );
};
