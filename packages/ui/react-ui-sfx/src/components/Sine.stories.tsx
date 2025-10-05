//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

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
    classNames: 'w-[20rem] h-[10rem] _outline outline-primary-500 rounded-md',
  },
};

export const Mini: Story = {
  args: {
    classNames: 'w-[4rem] h-[4rem] border border-neutral-500 rounded-md',
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
