//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TestItem } from '../../testing';
import { Mosaic } from '../Mosaic';

import { Stack } from './Stack';

faker.seed(999);

const meta: Meta<typeof Stack> = {
  title: 'ui/react-ui-mosaic/Stack',
  component: Stack,
  decorators: [
    (Story) => {
      const viewportRef = useRef<HTMLElement | null>(null);
      return (
        <Mosaic.Root asChild>
          <Mosaic.Container asChild axis='vertical' autoScroll={viewportRef.current} eventHandler={{ id: 'test' }}>
            <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} viewportRef={viewportRef}>
              <Story />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </Mosaic.Root>
      );
    },
    withLayout({ layout: 'column' }),
    withTheme,
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    axis: 'vertical',
    className: 'pli-3',
    items: Array.from({ length: 100 }, () =>
      Obj.make(TestItem, {
        name: faker.lorem.paragraph(),
      }),
    ),
  },
};
