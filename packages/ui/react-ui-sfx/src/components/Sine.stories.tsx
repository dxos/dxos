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
    classNames: 'w-[20rem] h-[10rem] _outline outline-primary-500 rounded-lg',
  },
};

export const Mini: Story = {
  args: {
    classNames: 'w-[4rem] h-[4rem] border border-neutral-500 rounded-lg',
  },
};

export const Fullscreen: Story = {
  args: {
    classNames: 'fixed inset-0 w-screen h-screen',
  },
  parameters: {
    layout: 'fullscreen',
  },
};
