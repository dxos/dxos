//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { TopicArticle } from '@dxos/plugin-brain/containers';
import { translations as brainTranslations } from '@dxos/plugin-brain/translations';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Topic } from '@dxos/types';

// A fully-populated topic and a bare one (only label + summary) to exercise the omitted-section paths.
const FULL_TOPIC = 'q2 report budget';
const BARE_TOPIC = 'quick note';

const seedTopics = (space: Space) => {
  space.db.add(
    Obj.make(Topic.Topic, {
      label: FULL_TOPIC,
      summary: 'Alice circulated the Q2 report and budget for review.',
      threadIds: ['q2 report', 'q2 budget'],
      participants: ['alice@example.com', 'me@example.com'],
      keywords: ['q2', 'report', 'budget'],
      questions: ['When is the budget due?', 'Who signs off?'],
      tasks: ['Review the draft.'],
    }),
  );
  space.db.add(
    Obj.make(Topic.Topic, {
      label: BARE_TOPIC,
      summary: 'A short note with no threads, questions, or tasks.',
      threadIds: [],
      participants: [],
      keywords: [],
      questions: [],
      tasks: [],
    }),
  );
};

const DefaultStory = ({ label = FULL_TOPIC }: { label?: string }) => {
  const [space] = useSpaces();
  const topics = useQuery(space?.db, Filter.type(Topic.Topic));
  const topic = topics.find((entry) => entry.label === label);

  if (!space?.db || !topic) {
    return <Loading data={{ db: !!space?.db, topic: !!topic }} />;
  }

  return <TopicArticle role='article' subject={topic} />;
};

const meta = {
  title: 'stories/stories-inbox/TopicArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Topic.Topic],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(Mailbox.make());
                seedTopics(personalSpace);
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...brainTranslations, ...inboxTranslations, ...reactUiTranslations],
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** A fully-populated topic: summary, keyword chips, participants, questions, and tasks. */
export const Default: Story = {};

/** A bare topic (label + summary only) — the empty sections are omitted. */
export const Minimal: Story = { render: () => <DefaultStory label={BARE_TOPIC} /> };

/** Asserts the detail view surfaces each stored field of the full topic. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText(FULL_TOPIC)).toBeInTheDocument());
    void expect(canvas.getByText(/Alice circulated the Q2 report/)).toBeInTheDocument();
    void expect(canvas.getByText('q2')).toBeInTheDocument(); // keyword chip
    void expect(canvas.getByText(/alice@example\.com/)).toBeInTheDocument(); // participants
    void expect(canvas.getByText('When is the budget due?')).toBeInTheDocument(); // question
    void expect(canvas.getByText('Review the draft.')).toBeInTheDocument(); // task
  },
};
