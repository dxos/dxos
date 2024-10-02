//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack, type StackProps } from './Stack';

const StackItem = () => {
  return <div className='border border-separator p-2'>This is an item</div>;
};

const StorybookStack = ({ orientation }: StackProps) => {
  return (
    <Stack orientation={orientation}>
      <StackItem />
      <StackItem />
      <StackItem />
      <StackItem />
    </Stack>
  );
};

const meta: Meta<typeof StorybookStack> = {
  title: 'react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof StorybookStack>;

export const Default: Story = {
  args: { orientation: 'horizontal' },
};
