//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Direction, Stack } from './Stack';
import { MosaicDataItem, MosaicMoveEvent, MosaicTileComponent, useSortedItems } from '../../dnd';
import { createItem, ComplexCard, FullscreenDecorator, SimpleCard, MosaicDecorator } from '../../testing';
import { Debug } from '../Debug';

faker.seed(3);

const StackStory: FC<{
  id: string;
  Component: MosaicTileComponent<any>;
  types?: string[];
  count?: number;
  direction?: Direction;
  debug?: boolean;
}> = ({ id = 'stack', Component, types, count = 3, direction = 'vertical', debug }) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: count }).map(() => createItem(types)),
  );
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
    <div className={mx('flex overflow-hidden', direction === 'vertical' && 'w-[300px]')}>
      <Stack.Root id={id} Component={Component} onDrop={handleDrop} debug={debug}>
        <Stack.Viewport items={sortedItems} direction={direction}>
          <div className={mx('flex flex-col', direction === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto')}>
            <div className={mx('flex gap-4', direction === 'vertical' && 'flex-col')}>
              {sortedItems.map((item, i) => (
                <Stack.Tile key={item.id} item={item} index={i} />
              ))}
            </div>
            {debug && <Debug data={{ id: 'stack', items: sortedItems.length }} />}
          </div>
        </Stack.Viewport>
      </Stack.Root>
    </div>
  );
};

export default {
  component: StackStory,
  decorators: [FullscreenDecorator(), MosaicDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    Component: SimpleCard,
    count: 10,
    debug: true,
  },
};

export const Horizontal = {
  args: {
    Component: SimpleCard,
    direction: 'horizontal',
    count: 3,
    debug: true,
  },
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
    count: 3,
    debug: true,
  },
};
