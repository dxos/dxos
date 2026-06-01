//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type DiscordPresence } from '#hooks';
import { translations } from '#translations';

import { FeedbackForm, type FeedbackSubmitHandler } from './FeedbackForm';

type FeedbackFormStoryProps = {
  hidden?: { version?: string };
  onSave?: FeedbackSubmitHandler;
  onDownloadLogs?: () => void;
  onDiscord?: FeedbackSubmitHandler;
  onGitHub?: FeedbackSubmitHandler;
  discordPresence?: DiscordPresence;
};

const FeedbackFormStory = ({
  hidden,
  onSave,
  onDownloadLogs,
  onDiscord,
  onGitHub,
  discordPresence,
}: FeedbackFormStoryProps) => (
  <FeedbackForm.Root hidden={hidden}>
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
        <FeedbackForm.DownloadLogs onDownloadLogs={onDownloadLogs} />
        <FeedbackForm.SubmitPosthog onSubmit={onSave ?? (() => {})} />
        <FeedbackForm.SubmitGitHub onSubmit={onGitHub} />
        <FeedbackForm.SubmitDiscord onSubmit={onDiscord} />
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
