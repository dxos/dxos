//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Voice } from './Voice';

const meta: Meta<typeof Voice> = {
  title: 'plugins/plugin-transformer/Voice',
  component: Voice,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Voice>;

export const Default: Story = {
  args: {
    debug: true,
    active: true,
    model: 'Xenova/whisper-tiny',
  },
};
