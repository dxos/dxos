//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordBotToolbar } from './DiscordBotToolbar.tsx';

const meta = {
  title: 'plugins/plugin-discord/components/DiscordBotToolbar',
  component: DiscordBotToolbar,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DiscordBotToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Running: Story = {
  args: { running: true },
};

export const Busy: Story = {
  args: { running: true, busy: true },
};
