//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { faker } from '@dxos/random';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { DemoStack, type DemoStackProps } from './testing';
import { Mosaic } from '../../mosaic';
import { SimpleCard } from '../../testing';

faker.seed(3);

export default {
  title: 'react-ui-mosaic/Stack',
  component: Stack,
  render: (args: DemoStackProps) => {
    return (
      <Mosaic.Root debug={args.debug}>
        <div className='flex grow justify-center p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <DemoStack {...args} id='stack-1' />
            <DemoStack {...args} id='stack-2' />
          </div>
        </div>
        <Mosaic.DragOverlay debug={args.debug} />
      </Mosaic.Root>
    );
  },
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Transfer = {
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
