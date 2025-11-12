//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { Sine } from './Sine';

const meta = {
  title: 'ui/react-ui-sfx/Sine',
  component: Sine,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Sine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames: 'is-[20rem] bs-[10rem] _outline outline-primary-500 rounded-md',
  },
};

export const Mini: Story = {
  args: {
    classNames: 'is-[4rem] bs-[4rem] border border-neutral-500 rounded-md',
  },
};

export const Fullscreen: Story = {
  args: {
    classNames: 'fixed inset-0 is-screen bs-screen',
  },
  parameters: {
    layout: 'fullscreen',
  },
};
