//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { ConnectorsSkill, LinearSkill } from '@dxos/assistant-toolkit';
import { Feed, Filter, Ref } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { meta as connectorMeta } from '@dxos/plugin-connector';
import { CalendarSkill, InboxSkill } from '@dxos/plugin-inbox';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { TranscriptionSkill } from '@dxos/plugin-transcription';
import { Cell } from '@dxos/storybook-testing';
import { Event, Message, Person, Pipeline, Task, Transcript } from '@dxos/types';

import { StoryRole } from '../modules';
import {
  ModuleContainer,
  accessTokensFromEnv,
  addToRootCollection,
  config,
  createDecorators,
  createTestMailbox,
  createTestTranscription,
  storyParameters,
} from '../testing';
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Connectors',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Test with prompt: Summarize my mailbox and write the summary in a new document.
export const WithMail: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { ThreadPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-thread/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), MarkdownPlugin(), ThreadPlugin()],
      };
    },
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox' }));
      await space.db.flush();
      const feedObj = await mailbox.feed.load();
      const messages = createTestMailbox();
      await space.db.appendToFeed(feedObj, messages);
    },
    types: [Feed.Feed, Mailbox.Mailbox],
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
    skills: [AssistantSkill.key, MarkdownSkill.key, InboxSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

/**
 * Prompt: "sync my email".
 */
export const WithGmail: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { ConnectorPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-connector/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), ConnectorPlugin()],
      };
    },
    config: config.persistent,
    types: [Feed.Feed, Mailbox.Mailbox],
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox' }));
      addToRootCollection(space, [mailbox]);
      return [
        [StoryRole.Chat],
        [
          Cell.article(mailbox),
          { type: AppSurface.Article, data: { subject: `${connectorMeta.profile.key}.space-settings` } },
        ],
        [StoryRole.Context],
      ];
    },
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
    skills: [AssistantSkill.key, InboxSkill.key],
  }),
};

/**
 * Agent-facing connector prompt surface. The chat is seeded with an assistant turn that emits an
 * `integration-prompt` surface (the `<surface role='integration-prompt' data='{"service":"gmail.com"}' />`
 * content block) so the connector prompt renders inline — the model would emit this, instead of failing,
 * when a request needs a service the user has not connected (see the Connectors skill).
 */
export const WithConnectorPrompt: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { ConnectorPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-connector/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), ConnectorPlugin()],
      };
    },
    types: [Feed.Feed, Mailbox.Mailbox],
    onChatCreated: async ({ space, chat }) => {
      const feed = await chat.feed.load();
      await space.db.appendToFeed(feed, [
        Message.make({
          sender: 'assistant',
          blocks: [
            { _tag: 'text', text: 'Gmail is not connected yet. Connect it to continue:' },
            { _tag: 'surface', role: 'integration-prompt', data: { service: 'gmail.com' } },
          ],
        }),
      ]);
    },
    skills: [AssistantSkill.key, ConnectorsSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

// Test with prompt: Sync my calendar.
export const WithCalendar: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { ConnectorPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-connector/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), ConnectorPlugin()],
      };
    },
    types: [Feed.Feed, Calendar.Calendar, Event.Event],
    onInit: async ({ space }) => {
      space.db.add(Calendar.make({ name: 'Calendar' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const calendars = await space.db.query(Filter.type(Calendar.Calendar)).run();
      const calendar = calendars[0];
      if (calendar) {
        await binder.bind({ objects: [Ref.make(calendar)] });
      }
    },
    skills: [AssistantSkill.key, CalendarSkill.key],
  }),
  args: {
    layout: [
      [StoryRole.Chat],
      [{ type: AppSurface.Article, data: { subject: `${connectorMeta.profile.key}.space-settings` } }],
      [StoryRole.Context],
    ],
  },
};

// TODO(burdon): Move to env.
const VITE_LINEAR_API_KEY = process.env.VITE_LINEAR_API_KEY;

export const WithLinearSync: Story = {
  decorators: createDecorators({
    plugins: [],
    types: [Task.Task, Person.Person, Pipeline.Pipeline],
    accessTokens: accessTokensFromEnv({
      'linear.app': VITE_LINEAR_API_KEY,
    }),
    skills: [LinearSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Graph]],
  },
};

export const WithTranscription: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ TranscriptionPlugin }, { PreviewPlugin }] = await Promise.all([
        import('@dxos/plugin-transcription/plugin'),
        import('@dxos/plugin-preview/plugin'),
      ]);
      return {
        plugins: [TranscriptionPlugin(), PreviewPlugin()],
      };
    },
    types: [Transcript.Transcript],
    onInit: async ({ space }) => {
      const feed = space.db.add(Feed.make());
      const messages = createTestTranscription();
      await space.db.appendToFeed(feed, messages);
      space.db.add(Transcript.make(Ref.make(feed)));
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Transcript.Transcript)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
    skills: [AssistantSkill.key, TranscriptionSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};
