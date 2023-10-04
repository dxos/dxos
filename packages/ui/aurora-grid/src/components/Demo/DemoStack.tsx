//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, HTMLAttributes, useState } from 'react';

import { mx } from '@dxos/aurora-theme';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, MosaicDataItem, useSortedItems } from '../../dnd';
import { createItem } from '../../testing';
import { Stack } from '../Stack';

export const DemoStack: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  Component,
  className,
}) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => Array.from({ length: 10 }).map(() => createItem(types)));

  const sortedItems = useSortedItems({ container: id, items });

  const handleDrop = ({ container, active, over }: MosaicMoveEvent<number>) => {
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

  return (
    <Stack.Root id={id} Component={Component} onDrop={handleDrop} debug={debug}>
      <Stack.Viewport items={items}>
        <div className={mx('flex flex-col overflow-y-scroll', className)}>
          <div className='flex flex-col gap-2'>
            {sortedItems.map((item, i) => (
              <Stack.Tile key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </Stack.Viewport>
    </Stack.Root>
  );
};
