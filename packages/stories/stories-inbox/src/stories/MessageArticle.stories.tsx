//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Feed } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin, initializeMailbox, seedSummaries } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';
import { Message, Person } from '@dxos/types';

import { StoryRole, THREAD_CONTEXT_ID } from '../modules/index.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';

type StoryArgs = {
  /** Number of messages seeded into the single fake thread. */
  length?: number;
};

/**
 * The seeded mailbox's one thread opened from its most recent message, beside the JSON of the
 * selected message — summaries in particular come from a separate annotation feed rather than from
 * the message.
 */
const DefaultStory = () => (
  <ModuleContainer layout={[[{ type: StoryRole.Thread, id: THREAD_CONTEXT_ID }], [StoryRole.ThreadJson]]} />
);

const meta = {
  title: 'stories/stories-inbox/MessageArticle',
  render: DefaultStory,
  decorators: createStoryDecorators<StoryArgs>(({ args: { length = 8 } }) => ({
    types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
    plugins: [InboxPlugin(), PreviewPlugin.make(), StoryModulesPlugin()],
    onInit: async ({ space }) => {
      // Thread pool of size 1 assigns every seeded message the same threadId — a single
      // conversation of exactly `length` messages, oldest to newest.
      const mailbox = await initializeMailbox(space.db, length, 1);
      // Half the conversation carries a derived summary, so the summary tile renders from a
      // realistic mix (the tile shows the newest summarized message, not every one).
      await seedSummaries(space.db, mailbox);
    },
  })),
  parameters: {
    layout: 'fullscreen',
    translations: inboxTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    length: 8,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The opened (most recent) message is the one expanded, so exactly one Reply All shows.
    const replyButtons = await canvas.findAllByRole('button', { name: 'Reply All' }, { timeout: 12_000 });
    await expect(replyButtons).toHaveLength(1);
    await expect(await canvas.findByTestId('thread-json', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};
