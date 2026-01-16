//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

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
    withTheme,
    withLayout({ layout: 'column' }),
    (Story) => {
      const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
      return (
        <Mosaic.Root>
          <Mosaic.Container axis='vertical' autoScroll={viewportElement} eventHandler={{ id: 'test' }}>
            <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} onViewportReady={setViewportElement}>
              <Story />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </Mosaic.Root>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 100 }, () =>
      Obj.make(TestItem, {
        name: faker.lorem.paragraph(),
      }),
    ),
  },
};
