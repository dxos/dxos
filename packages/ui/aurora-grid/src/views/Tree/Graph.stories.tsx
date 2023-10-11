//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { GraphTree } from './testing';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator } from '../../testing';

faker.seed(3);

export default {
  title: 'Tree',
  render: ({ id = 'tree', debug }: { id: string; debug: boolean }) => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <GraphTree id={id} debug={debug} />
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Graph = {
  args: { debug: true },
};
