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

type TestStackProps = StackProps & {
  types: string[];
  count: number;
  behavior?: 'move' | 'copy' | 'disallow';
};

const TestStack = ({
  id = 'stack',
  Component,
  types,
  count = 8,
  direction = 'vertical',
  behavior = 'move',
  debug,
}: TestStackProps) => {
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
    <Stack
      id={id}
      Component={Component}
      onDrop={handleDrop}
      isDroppable={handleDroppable}
      items={items}
      direction={direction}
      debug={debug}
    />
  );
};

const StackStory = (args: TestStackProps) => {
  return (
    <Mosaic.Root debug={args.debug}>
      <Mosaic.DragOverlay />
      <div className='flex grow justify-center p-4'>
        <div className='grid grid-cols-2 gap-4'>
          <TestStack {...args} id='stack-1' />
          <TestStack {...args} id='stack-2' />
        </div>
      </div>
    </Mosaic.Root>
  );
};

export default {
  title: 'Stack/Columns',
  component: StackStory,
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
};

// TODO(burdon): Should not hide from source while dragging.
export const Copy = {
  args: {
    Component: SimpleCard,
    debug: true,
    behavior: 'copy',
  },
};

export const Disallow = {
  args: {
    Component: SimpleCard,
    debug: true,
    behavior: 'disallow',
  },
};
