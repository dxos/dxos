//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type DiscordPresence } from '#hooks';
import { translations } from '#translations';

import { FeedbackForm, type FeedbackReportToProjectHandler, type FeedbackSubmitHandler } from './FeedbackForm.tsx';
import { type FeedbackProjectOption } from './types.ts';

type FeedbackFormStoryArgs = {
  hidden?: { version?: string };
  onSubmit?: FeedbackSubmitHandler;
  onDownloadLogs?: () => void;
  discordPresence?: DiscordPresence;
  projects?: FeedbackProjectOption[];
  onReport?: FeedbackReportToProjectHandler;
};

const FeedbackFormStory = ({
  hidden,
  onSubmit,
  onDownloadLogs,
  discordPresence,
  projects,
  onReport,
}: FeedbackFormStoryArgs) => (
  <FeedbackForm.Root hidden={hidden} onSubmit={onSubmit ?? (() => true)}>
    <Form.Viewport>
      <Form.Content>
        <Form.Fields />
        <FeedbackForm.DownloadLogs onDownloadLogs={onDownloadLogs} />
        <FeedbackForm.Submit />
        <FeedbackForm.DiscordPresence discordPresence={discordPresence} />
        <FeedbackForm.ReportToProject projects={projects} onReport={onReport} />
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
      return true;
    },
  },
};

export const WithDownloadLogs: Story = {
  args: {
    onSubmit: (values) => {
      console.log(values);
      return true;
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
      return true;
    },
    discordPresence: {
      teamOnline: 2,
      communityOnline: 14,
    },
  },
};

export const WithProjects: Story = {
  args: {
    onSubmit: (values) => {
      console.log(values);
      return true;
    },
    projects: [
      { id: 'project-1', name: 'Composer' },
      { id: 'project-2', name: 'Edge' },
    ],
    onReport: (projectId, values) => {
      console.log(projectId, values);
      return true;
    },
  },
};
