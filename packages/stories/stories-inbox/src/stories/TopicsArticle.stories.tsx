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
import { TopicsArticle } from '@dxos/plugin-inbox/containers';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { AnchoredTo } from '@dxos/types';

// Two accepted topics.
const seedTopics = (space: Space) => {
  space.db.add(
    Obj.make(Topic, {
      label: 'q2 report budget',
      summary: 'Alice circulated the Q2 report and budget.',
      threadIds: ['q2 report'],
      participants: ['alice@example.com'],
      keywords: ['q2', 'report', 'budget'],
      questions: ['When is the budget due?'],
      tasks: ['Review the draft.'],
    }),
  );
  space.db.add(
    Obj.make(Topic, {
      label: 'launch planning',
      summary: 'Launch date and checklist under discussion.',
      threadIds: ['launch plan'],
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

const Story = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  // Subscribe so accept/dismiss re-render.
  useQuery(space?.db, Filter.type(Topic));

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return <TopicsArticle role='article' space={space} attendableId='story' mailbox={mailbox} />;
};

const meta = {
  title: 'stories/stories-inbox/TopicsArticle',
  render: Story,
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
} satisfies Meta<typeof Story>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The master list: accepted topic cards below a "Suggested" section. */
export const Default: Story = {};

/** Deletes a topic via its card action menu and asserts it is removed. */
export const DeleteTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const budgetCard = await waitFor(
      () => canvas.getByText('q2 report budget').closest('[data-testid="topic-card"]') as HTMLElement,
    );
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();

    await userEvent.click(within(budgetCard).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/delete topic/i)));

    await waitFor(() => expect(canvas.queryByText('q2 report budget')).not.toBeInTheDocument());
    void expect(canvas.getByText('launch planning')).toBeInTheDocument();
  },
};

/** Accepts one suggestion (→ Topic) and dismisses another; asserts the Suggested list shrinks. */
export const SuggestionsTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const section = await waitFor(() => canvas.getByTestId('topics-suggested'));
    await waitFor(() => expect(within(section).getAllByTestId('topic-suggestion')).toHaveLength(2));

    const invoiceCard = within(section)
      .getByText('invoice acme')
      .closest('[data-testid="topic-suggestion"]') as HTMLElement;
    await userEvent.click(within(invoiceCard).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^accept$/i)));

    await waitFor(() => expect(canvas.getAllByTestId('topic-suggestion')).toHaveLength(1));
    void expect(within(canvas.getByTestId('topics-suggested')).queryByText('invoice acme')).toBeNull();

    const remaining = canvas.getByTestId('topic-suggestion');
    await userEvent.click(within(remaining).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^dismiss$/i)));

    await waitFor(() => expect(canvas.queryByTestId('topics-suggested')).toBeNull());
    void expect(canvas.queryByText('welcome onboarding')).toBeNull();
  },
};
