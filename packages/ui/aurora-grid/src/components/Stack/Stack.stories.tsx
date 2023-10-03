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
}> = ({ id = 'stack', Component, types, count = 3, direction, debug }) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: count }).map(() => createItem(types)),
  );
  const sortedItems = useSortedItems({ container: id, items });

  const handleMoveItem = ({ container, active, over }: MosaicMoveEvent<number>) => {
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

  // TODO(wittjosiah): Cleanup horizontal styles.

  return (
    <div className={mx('flex overflow-hidden', direction !== 'horizontal' && 'w-[300px]')}>
      <Stack.Root
        id={id}
        items={items.map(({ id }) => id)}
        Component={Component}
        onDrop={handleMoveItem}
        debug={debug}
        direction={direction}
      >
        <div className='flex flex-col overflow-y-scroll'>
          <div className='flex flex-col gap-4'>
            {sortedItems.map((item, i) => (
              // TODO(wittjosiah): Don't use array indexing.
              //  (burdon): Why? This assumes the caller has sorted the items.
              <Stack.Tile key={item.id} item={item} index={i} />
            ))}
          </div>
          {debug && <Debug data={{ id: 'stack', items: sortedItems.length }} />}
        </div>
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
