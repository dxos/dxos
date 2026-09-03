//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type DiscordPresence } from '#hooks';
import { translations } from '#translations';

import { FeedbackForm, type FeedbackSubmitHandler } from './FeedbackForm';

type FeedbackFormStoryArgs = {
  hidden?: { version?: string };
  onSubmit?: FeedbackSubmitHandler;
  onDownloadLogs?: () => void;
  discordPresence?: DiscordPresence;
};

const FeedbackFormStory = ({ hidden, onSubmit, onDownloadLogs, discordPresence }: FeedbackFormStoryArgs) => (
  <FeedbackForm.Root hidden={hidden}>
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
        <FeedbackForm.DownloadLogs onDownloadLogs={onDownloadLogs} />
        <FeedbackForm.Submit onSubmit={onSubmit ?? (() => {})} />
        <FeedbackForm.DiscordPresence discordPresence={discordPresence} />
      </Form.Content>
    </Form.Viewport>
  </FeedbackForm.Root>
);

const meta = {
  title: 'plugins/plugin-support/components/FeedbackForm',
  component: FeedbackFormStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof FeedbackFormStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: (values) => {
      console.log(values);
    },
  },
};

export const WithDownloadLogs: Story = {
  args: {
    onSubmit: (values) => {
      console.log(values);
    },
    onDownloadLogs: () => {
      console.log('download logs clicked');
    },
  },
};

export const WithPresence: Story = {
  args: {
    onSubmit: (values) => {
      console.log(values);
    },
    discordPresence: {
      teamOnline: 2,
      communityOnline: 14,
    },
  },
};
