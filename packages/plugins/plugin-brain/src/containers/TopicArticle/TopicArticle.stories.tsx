//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Topic } from '@dxos/types';

import { translations } from '../../translations';
import { TopicArticle } from './TopicArticle';

const FULL_TOPIC = 'q2 report budget';
const BARE_TOPIC = 'quick note';

// A fully-populated topic and a bare one (label + summary only) to exercise the omitted-section paths.
const seedTopics = (space: Space) => {
  space.db.add(
    Topic.make({
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
    Topic.make({
      label: BARE_TOPIC,
      summary: 'A short note with no threads, questions, or tasks.',
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
  title: 'plugins/plugin-brain/containers/TopicArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Topic.Topic],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seedTopics(personalSpace);
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A fully-populated topic: summary, keyword chips, participants, questions, and tasks. */
export const Default: Story = {};

/** A bare topic (label + summary only) — the empty sections are omitted. */
export const Minimal: Story = { render: () => <DefaultStory label={BARE_TOPIC} /> };

// NOTE: no interactive `play` test — the seeded-space content doesn't resolve in the headless storybook
// test runner; the story renders live in the running storybook (dev server).
