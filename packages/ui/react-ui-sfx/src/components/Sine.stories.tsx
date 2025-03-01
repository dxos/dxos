//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';

import { Sine } from './Sine';

const meta: Meta<typeof Sine> = {
  title: 'ui/react-ui-sfx/Sine',
  component: Sine,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Sine>;

export const Default: Story = {
  args: {
    classNames: 'w-[30rem] h-[10rem] outline outline-primary-500 rounded',
  },
};
