//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ConnectorsSkill, LinearSkill } from '@dxos/assistant-toolkit';
import { Feed, Filter, Ref } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { Calendar, CalendarSkill, InboxSkill, Mailbox } from '@dxos/plugin-inbox';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { TranscriptionSkill } from '@dxos/plugin-transcription';
import { Event, Message, Person, Pipeline, Task, Transcript } from '@dxos/types';

import {
  Module,
  ModuleContainer,
  accessTokensFromEnv,
  config,
  createDecorators,
  createTestMailbox,
  createTestTranscription,
} from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Connectors',
  render: ModuleContainer,
  decorators: storyDecorators,
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
    config: config.remote,
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
  }),
  args: {
    layout: [[Module.Chat], [Module.Context]],
    skills: [AssistantSkill.key, MarkdownSkill.key, InboxSkill.key],
  },
};

// Test with prompt: Sync my email.
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
      space.db.add(Mailbox.make({ name: 'Mailbox' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Inbox, Module.TokenManager], [Module.Context]],
    skills: [AssistantSkill.key, InboxSkill.key],
  },
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
    config: config.remote,
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
  }),
  args: {
    layout: [[Module.Chat], [Module.Context]],
    skills: [AssistantSkill.key, ConnectorsSkill.key],
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
    config: config.remote,
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
  }),
  args: {
    layout: [[Module.Chat], [Module.TokenManager], [Module.Context]],
    skills: [AssistantSkill.key, CalendarSkill.key],
  },
};

// TODO(burdon): Move to env.
const VITE_LINEAR_API_KEY = process.env.VITE_LINEAR_API_KEY;

export const WithLinearSync: Story = {
  decorators: createDecorators({
    plugins: [],
    config: config.remote,
    types: [Task.Task, Person.Person, Pipeline.Pipeline],
    accessTokens: accessTokensFromEnv({
      'linear.app': VITE_LINEAR_API_KEY,
    }),
  }),
  args: {
    layout: [[Module.Chat], [Module.Graph]],
    skills: [LinearSkill.key],
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
    config: config.remote,
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
  }),
  args: {
    layout: [[Module.Chat], [Module.Context]],
    skills: [AssistantSkill.key, TranscriptionSkill.key],
  },
};
