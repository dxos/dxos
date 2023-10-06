//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useRef, useState } from 'react';

import { Stack, StackProps } from './Stack';
import { Mosaic, MosaicDataItem, MosaicMoveEvent } from '../../mosaic';
import { createItem, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

type StoryProps = StackProps & {
  types: string[];
  count: number;
  behavior?: 'move' | 'copy' | 'disallow';
};

const StackStory = ({
  id = 'stack',
  Component,
  types,
  count = 3,
  direction = 'vertical',
  behavior = 'move',
  debug,
}: StoryProps) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() =>
    Array.from({ length: count }).map(() => createItem(types)),
  );
  const itemsRef = useRef(items);

  const handleDrop = ({ container, active, over }: MosaicMoveEvent<number>) => {
    setItems((items) => {
      if (active.container === container && (behavior !== 'copy' || over.container === container)) {
        items.splice(active.position!, 1);
      }
      if (over.container === container) {
        items.splice(over.position!, 0, active.item);
      }
      const i = [...items];
      itemsRef.current = i;
      return i;
    });
  };

  const handleDroppable = ({ active, over }: MosaicMoveEvent<number>) => {
    return (
      // TODO(wittjosiah): Items is stale here for some inexplicable reason, so ref helps.
      (itemsRef.current.findIndex((item) => item.id === active.item.id) === -1 ||
        active.container === over.container) &&
      (active.container === id || behavior !== 'disallow')
    );
  };

  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Stack
        id={id}
        Component={Component}
        onDrop={handleDrop}
        isDroppable={handleDroppable}
        items={items}
        direction={direction}
        debug={debug}
      />
    </Mosaic.Root>
  );
};

export default {
  title: 'Stack/Multiple',
  component: Stack,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Move = {
  args: {
    Component: SimpleCard,
    debug: true,
  },
  render: (args: StoryProps) => {
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
  render: (args: StoryProps) => {
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
  render: (args: StoryProps) => {
    return (
      <div className='flex grow justify-around'>
        <StackStory {...args} id='a' />
        <StackStory {...args} id='b' />
      </div>
    );
  },
};
