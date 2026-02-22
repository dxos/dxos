//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { Sine } from './Sine';

const meta = {
  title: 'ui/react-ui-sfx/Sine',
  component: Sine,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Sine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames: 'inline-[20rem] block-[10rem] _outline outline-primary-500 rounded-md',
  },
};

export const Mini: Story = {
  args: {
    classNames: 'inline-[4rem] block-[4rem] border border-neutral-500 rounded-md',
  },
};

export const Fullscreen: Story = {
  args: {
    classNames: 'fixed inset-0 inline-screen block-screen',
  },
  parameters: {
    layout: 'fullscreen',
  },
};
