//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Stack } from './Stack';
import { DemoStack, type DemoStackProps } from './testing';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(3);

export default {
  title: 'Views/Stack/Columns',
  component: Stack,
  render: (args: DemoStackProps) => {
    return (
      <Mosaic.Root debug={args.debug}>
        <Mosaic.DragOverlay />
        <div className='flex grow justify-center p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <DemoStack {...args} id='stack-1' />
            <DemoStack {...args} id='stack-2' />
          </div>
        </div>
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Adopt = {
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
    operation: 'copy',
  },
};

export const Reject = {
  args: {
    Component: SimpleCard,
    debug: true,
    operation: 'reject',
  },
};
