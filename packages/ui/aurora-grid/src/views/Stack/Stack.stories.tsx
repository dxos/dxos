//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Stack, StackProps } from './Stack';
import { DemoStack } from './testing';
import { Mosaic } from '../../mosaic';
import { ComplexCard, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

export default {
  component: Stack,
  render: (
    args: StackProps & {
      types: string[];
      count: number;
    },
  ) => {
    return (
      <Mosaic.Root>
        <Mosaic.DragOverlay />
        <DemoStack {...args} />
      </Mosaic.Root>
    );
  },
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
};

export const Horizontal = {
  args: {
    Component: SimpleCard,
    direction: 'horizontal',
    count: 8,
    debug: true,
  },
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
    count: 8,
    debug: true,
  },
};
