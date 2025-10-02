//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Voice } from './Voice';

const meta = {
  title: 'plugins/plugin-transformer/Voice',
  component: Voice,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Voice>;

export default meta;

type Story = StoryObj<typeof Voice>;

export const Default: Story = {
  args: {
    debug: true,
    active: true,
    model: 'Xenova/whisper-tiny',
  },
};
