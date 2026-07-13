//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { Topic } from '@dxos/pipeline-email';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { TopicArticle, TopicsArticle } from '@dxos/plugin-inbox/containers';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

// Two deterministic topics — no LLM needed; TopicsArticle just queries + renders `Topic` objects.
const seedTopics = (space: Space) => {
  space.db.add(
    Obj.make(Topic, {
      label: 'q2 report budget',
      summary: 'Alice circulated the Q2 report and budget.',
      threadIds: ['t1', 't2'],
      participants: ['alice@example.com', 'me@example.com'],
      keywords: ['q2', 'report', 'budget'],
      questions: ['When is the budget due?'],
      tasks: ['Review the draft.'],
    }),
  );
  space.db.add(
    Obj.make(Topic, {
      label: 'launch planning',
      summary: 'Launch date and checklist under discussion.',
      threadIds: ['t3'],
      participants: ['bob@example.com'],
      keywords: ['launch', 'planning'],
      questions: [],
      tasks: [],
    }),
  );
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const topics = useQuery(space?.db, Filter.type(Topic));

  if (!space?.db || !mailbox || topics.length === 0) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox, topics: topics.length }} />;
  }

  return <TopicsArticle role='article' space={space} attendableId='story' mailbox={mailbox} />;
};

const meta = {
  title: 'stories/stories-inbox/Topics',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Topic],
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
    translations: [...inboxTranslations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Renders the seeded topics as cards, each with an action menu offering "Delete topic". */
export const Default: Story = {};

/** Renders the `TopicArticle` detail for one seeded topic. */
const DetailStory = () => {
  const [space] = useSpaces();
  const topics = useQuery(space?.db, Filter.type(Topic));
  const topic = topics.find((entry) => entry.label === 'q2 report budget');

  if (!space?.db || !topic) {
    return <Loading data={{ db: !!space?.db, topic: !!topic }} />;
  }

  return <TopicArticle role='article' subject={topic} attendableId='story' />;
};

/** The detail view renders the topic's summary, keyword chips, participants, questions, and tasks. */
export const Detail: Story = { render: DetailStory };

/** Asserts the detail view surfaces each stored field. */
export const DetailTest: Story = {
  render: DetailStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('q2 report budget')).toBeInTheDocument());
    void expect(canvas.getByText('Alice circulated the Q2 report and budget.')).toBeInTheDocument();
    void expect(canvas.getByText('q2')).toBeInTheDocument(); // keyword chip
    void expect(canvas.getByText(/alice@example\.com/)).toBeInTheDocument(); // participants
    void expect(canvas.getByText('When is the budget due?')).toBeInTheDocument(); // question
    void expect(canvas.getByText('Review the draft.')).toBeInTheDocument(); // task
  },
};

/** Opens the first card's action menu, deletes that topic, and asserts the card is removed. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Both seeded topics render.
    await waitFor(() => expect(canvas.getByText('q2 report budget')).toBeInTheDocument());
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();

    // Open the first card's action menu. TopicsArticle has no other buttons, so every button is a
    // card's `Card.Menu` trigger — one per topic.
    const menuTriggers = await waitFor(() => {
      const triggers = canvas.getAllByRole('button');
      void expect(triggers.length).toBeGreaterThanOrEqual(2);
      return triggers;
    });
    await userEvent.click(menuTriggers[0]);

    // The dropdown offers "Delete topic".
    const deleteItem = await waitFor(() => body.getByText(/delete topic/i));
    await userEvent.click(deleteItem);

    // The first topic is gone; the second remains.
    await waitFor(() => expect(canvas.queryByText('q2 report budget')).not.toBeInTheDocument());
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();
  },
};
