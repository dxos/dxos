//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem } from './StackItem';

const KanbanBlock = () => {
  return <div className='is-64 bs-24 bg-input rounded-lg border border-separator shadow-sm'></div>;
};

const StorybookStack = () => {
  return (
    <Stack orientation={'horizontal'} classNames='gap-2'>
      {[...Array(3)].map((_, index) => (
        <StackItem key={index} orientation={'horizontal'}>
          <Stack orientation={'vertical'} classNames='gap-1'>
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
