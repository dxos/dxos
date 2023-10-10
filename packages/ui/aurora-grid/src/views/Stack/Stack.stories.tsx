//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Stack, StackProps } from './Stack';
import { Mosaic, MosaicDataItem, MosaicMoveEvent } from '../../mosaic';
import { ComplexCard, FullscreenDecorator, SimpleCard, TestObjectGenerator } from '../../testing';

faker.seed(3);

const StackStory = ({
  id = 'stack',
  Component,
  types,
  count = 3,
  direction = 'vertical',
  debug,
}: StackProps & {
  types: string[];
  count: number;
}) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

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
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Stack id={id} Component={Component} onDrop={handleDrop} items={items} direction={direction} debug={debug} />;
    </Mosaic.Root>
  );
};

export default {
  component: Stack,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    Component: SimpleCard,
    count: 8,
    debug: true,
  },
  render: StackStory,
};

export const Horizontal = {
  args: {
    Component: SimpleCard,
    direction: 'horizontal',
    count: 8,
    debug: true,
  },
  render: StackStory,
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
    count: 8,
    debug: true,
  },
  render: StackStory,
};
