//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem } from './StackItem';

const KanbanBlock = () => {
  return <div className='is-64 bs-24 bg-unAccent m-2 rounded'></div>;
};

const StorybookStack = () => {
  return (
    <Stack orientation={'horizontal'}>
      {[...Array(3)].map((_, index) => (
        <StackItem key={index} orientation={'horizontal'}>
          <Stack orientation={'vertical'}>
            {[...Array(4)].map((_, innerIndex) => (
              <StackItem key={innerIndex} orientation={'vertical'}>
                <KanbanBlock />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      ))}
    </Stack>
  );
};

const meta: Meta<typeof StorybookStack> = {
  title: 'react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
};

export default meta;

type Story = StoryObj<typeof StorybookStack>;

export const Default: Story = {
  args: { orientation: 'horizontal' },
};
