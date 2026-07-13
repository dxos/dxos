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
import { AnchoredTo } from '@dxos/types';

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

// Two unaccepted suggestions on the mailbox (same field shape as a Topic).
const seedSuggestions = (mailbox: Mailbox.Mailbox) =>
  Obj.update(mailbox, (mailbox) => {
    mailbox.topicSuggestions = [
      {
        label: 'invoice acme',
        summary: 'Acme invoice thread.',
        threadIds: ['inv1'],
        participants: ['ap@acme.com'],
        keywords: ['invoice', 'acme'],
        questions: [],
        tasks: [],
      },
      {
        label: 'welcome onboarding',
        summary: 'Onboarding welcome.',
        threadIds: ['w1'],
        participants: ['team@corp.com'],
        keywords: ['welcome'],
        questions: [],
        tasks: [],
      },
    ];
  });

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
          types: [Mailbox.Mailbox, Topic, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                const mailbox = personalSpace.db.add(Mailbox.make());
                seedTopics(personalSpace);
                seedSuggestions(mailbox);
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

/** Accepts one suggestion (→ becomes a Topic) and dismisses another; asserts the Suggested list shrinks. */
export const SuggestionsTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const section = await waitFor(() => canvas.getByTestId('topics-suggested'));
    const sectionScope = within(section);
    await waitFor(() => expect(within(section).getAllByTestId('topic-suggestion')).toHaveLength(2));
    void expect(sectionScope.getByText('invoice acme')).toBeInTheDocument();

    // Accept the "invoice acme" suggestion via its action menu.
    const invoiceCard = sectionScope
      .getByText('invoice acme')
      .closest('[data-testid="topic-suggestion"]') as HTMLElement;
    await userEvent.click(within(invoiceCard).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^accept$/i)));

    // One suggestion remains; "invoice acme" is no longer a suggestion (it became a Topic).
    await waitFor(() => expect(canvas.getAllByTestId('topic-suggestion')).toHaveLength(1));
    void expect(within(canvas.getByTestId('topics-suggested')).queryByText('invoice acme')).toBeNull();

    // Dismiss the remaining "welcome onboarding" suggestion.
    const remaining = canvas.getByTestId('topic-suggestion');
    await userEvent.click(within(remaining).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^dismiss$/i)));

    // The Suggested section is gone; "welcome onboarding" no longer appears anywhere.
    await waitFor(() => expect(canvas.queryByTestId('topics-suggested')).toBeNull());
    void expect(canvas.queryByText('welcome onboarding')).toBeNull();
  },
};

/** Opens the first card's action menu, deletes that topic, and asserts the card is removed. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Both seeded topics render as topic cards.
    const budgetCard = await waitFor(
      () => canvas.getByText('q2 report budget').closest('[data-testid="topic-card"]') as HTMLElement,
    );
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();

    // Open that topic card's action menu and delete it.
    await userEvent.click(within(budgetCard).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/delete topic/i)));

    // The deleted topic is gone; the other remains.
    await waitFor(() => expect(canvas.queryByText('q2 report budget')).not.toBeInTheDocument());
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();
  },
};
