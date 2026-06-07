//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Sine } from './Sine';

const meta = {
  title: 'ui/react-ui-sfx/Sine',
  component: Sine,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Sine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: {
    classNames: 'w-[20rem] h-[10rem]',
  },
};

export const Mini: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: {
    classNames: 'w-[4rem] h-[4rem] border border-neutral-500 rounded-md',
  },
};

export const Fullscreen: Story = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: {
    classNames: 'fixed inset-0 w-screen h-screen',
  },
};
