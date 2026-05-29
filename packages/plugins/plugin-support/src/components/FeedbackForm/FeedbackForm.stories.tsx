//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FeedbackForm } from './FeedbackForm';

const meta = {
  title: 'plugins/plugin-support/components/FeedbackForm',
  component: FeedbackForm,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof FeedbackForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSave: (values) => {
      console.log(values);
    },
  },
};

export const WithDownloadLogs: Story = {
  args: {
    onSave: (values) => {
      console.log(values);
    },
    onDownloadLogs: () => {
      console.log('download logs clicked');
    },
  },
};

export const WithDiscord: Story = {
  args: {
    onSave: (values) => {
      console.log('posthog', values);
    },
    onDiscord: (values) => {
      console.log('discord', values);
    },
  },
};

export const WithDiscordAndPresence: Story = {
  args: {
    onSave: (values) => {
      console.log('posthog', values);
    },
    onDiscord: (values) => {
      console.log('discord', values);
    },
    discordPresence: {
      teamOnline: 2,
      communityOnline: 14,
    },
  },
};
