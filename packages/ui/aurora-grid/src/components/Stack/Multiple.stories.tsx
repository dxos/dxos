//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Direction, Stack } from './Stack';
import { MosaicDataItem, MosaicMoveEvent, MosaicTileComponent, useSortedItems } from '../../dnd';
import { createItem, FullscreenDecorator, SimpleCard, MosaicDecorator } from '../../testing';
import { Debug } from '../Debug';

faker.seed(3);

type Args = {
  id: string;
  Component: MosaicTileComponent<any>;
  types?: string[];
  count?: number;
  direction?: Direction;
  debug?: boolean;
  behavior?: 'move' | 'copy' | 'disallow';
};

const StackStory: FC<Args> = ({
  id = 'stack',
  Component,
  types,
  count = 3,
  direction = 'vertical',
  behavior = 'move',
  debug,
}) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: count }).map(() => createItem(types)),
  );
  const sortedItems = useSortedItems({ container: id, items });

  const handleDrop = ({ container, active, over }: MosaicMoveEvent<number>) => {
    setItems((items) => {
      if (active.container === container && (behavior !== 'copy' || over.container === container)) {
        items.splice(active.position!, 1);
      }
      if (over.container === container) {
        items.splice(over.position!, 0, active.item);
      }
      return [...items];
    });
  };

  const handleDroppable = ({ active, over }: MosaicMoveEvent<number>) => {
    return (
      (items.findIndex((item) => item.id === active.item.id) === -1 || active.container === over.container) &&
      (active.container === id || behavior !== 'disallow')
    );
  };

  return (
    <div className={mx('flex overflow-hidden', direction === 'vertical' && 'w-[300px]')}>
      <Stack.Root id={id} Component={Component} onDrop={handleDrop} isDroppable={handleDroppable} debug={debug}>
        <Stack.Viewport items={sortedItems} direction={direction}>
          <div className={mx('flex flex-col', direction === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto')}>
            <div className={mx('flex gap-4', direction === 'vertical' && 'flex-col')}>
              {sortedItems.map((item, i) => (
                <Stack.Tile key={item.id} item={item} index={i} debug />
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
  title: 'Stack/Multiple',
  decorators: [FullscreenDecorator(), MosaicDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Move = {
  args: {
    Component: SimpleCard,
    debug: true,
  },
  render: (args: Args) => {
    return (
      <div className='flex grow justify-around'>
        <StackStory {...args} id='a' />
        <StackStory {...args} id='b' />
      </div>
    );
  },
};

export const Copy = {
  args: {
    Component: SimpleCard,
    debug: true,
    behavior: 'copy',
  },
  render: (args: Args) => {
    return (
      <div className='flex grow justify-around'>
        <StackStory {...args} id='a' />
        <StackStory {...args} id='b' />
      </div>
    );
  },
};

export const Disallow = {
  args: {
    Component: SimpleCard,
    debug: true,
    behavior: 'disallow',
  },
  render: (args: Args) => {
    return (
      <div className='flex grow justify-around'>
        <StackStory {...args} id='a' />
        <StackStory {...args} id='b' />
      </div>
    );
  },
};
