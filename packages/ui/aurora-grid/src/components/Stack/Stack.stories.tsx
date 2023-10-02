//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { Stack } from './Stack';
import { MosaicDataItem, MosaicMoveEvent, MosaicTileComponent, useSortedItems } from '../../dnd';
import { createItem, ComplexCard, FullscreenDecorator, SimpleCard, MosaicDecorator } from '../../testing';

faker.seed(3);

const StackStory: FC<{ Component: MosaicTileComponent<any>; types?: string[] }> = ({ Component, types }) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => Array.from({ length: 10 }).map(() => createItem(types)));
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

  const sortedItems = useSortedItems('stack', items);

  // TODO(burdon): Cards change shape when dragged inside stacks.

  return (
    <div className='flex overflow-hidden w-[300px]'>
      <Stack.Root
        id={'stack'}
        items={items.map(({ id }) => id)}
        Component={Component}
        onMoveItem={handleMoveItem}
        debug
      >
        {sortedItems.map((item, i) => (
          // TODO(wittjosiah): Don't use array indexing.
          <Stack.Tile key={item.id} item={item} index={i} />
        ))}
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
  },
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
  },
};
