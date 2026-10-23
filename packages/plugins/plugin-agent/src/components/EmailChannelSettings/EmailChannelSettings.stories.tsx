//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { EmailChannelSettings } from './EmailChannelSettings.tsx';

const VALUES = { handle: 'kai', displayName: 'Kai', allowedSenders: ['braneframe.com', 'dxos.org'] };

const meta = {
  title: 'plugins/plugin-agent/components/EmailChannelSettings',
  component: EmailChannelSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof EmailChannelSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  args: {
    values: VALUES,
    status: { running: true, state: 'ready', detail: 'kai@dxos.ai · 2 threads · 5 received · 4 sent' },
  },
};

export const NotConnected: Story = {
  args: {
    values: VALUES,
    status: { running: false, state: 'idle', detail: 'kai@dxos.ai · 0 threads · 0 received · 0 sent' },
  },
};

export const Taken: Story = {
  args: {
    values: VALUES,
    status: { running: false, state: 'taken', detail: 'kai@dxos.ai · 3 threads', error: 'kai@dxos.ai is taken.' },
  },
};

export const Unreachable: Story = {
  args: {
    values: VALUES,
    error: 'EDGE mailbox request failed.',
  },
};
