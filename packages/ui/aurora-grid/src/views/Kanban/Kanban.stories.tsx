//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Kanban } from './Kanban';
import { DemoKanban, type DemoKanbanProps } from './testing';
import { Mosaic } from '../../mosaic';
import { ComplexCard, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

export default {
  component: Kanban,
  render: (args: DemoKanbanProps) => {
    return (
      <Mosaic.Root debug={args.debug}>
        <Mosaic.DragOverlay />
        <DemoKanban {...args} />
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
    count: 3,
    debug: false,
  },
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
    count: 4,
    debug: true,
  },
};
