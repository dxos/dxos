//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ChatStatusIndicator } from './ChatStatusIndicator.tsx';

const meta = {
  title: 'ui/react-ui-chat/ChatStatusIndicator',
  component: ChatStatusIndicator,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ChatStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Idle: alert while the preset settles, then ready. */
export const Default: Story = {
  args: {
    size: 6,
  },
};

export const Processing: Story = {
  args: {
    size: 6,
    processing: true,
  },
};

/** The error state; hover for the message. */
export const WithError: Story = {
  args: {
    size: 6,
    error: new Error('The model provider is unavailable (503).'),
  },
};
