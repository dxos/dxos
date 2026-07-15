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
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { TopicSuggestionsArticle } from '@dxos/plugin-inbox/containers';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { AnchoredTo, Topic } from '@dxos/types';

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
  // Subscribe to Topic so accept (which materializes a Topic) re-renders the suggestions list.
  useQuery(space?.db, Filter.type(Topic.Topic));

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return <TopicSuggestionsArticle role='article' subject={mailbox} attendableId='story' />;
};

const meta = {
  title: 'stories/stories-inbox/TopicSuggestions',
  render: Story,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Topic.Topic, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                const mailbox = personalSpace.db.add(Mailbox.make());
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

/** Type-guarded `closest` — narrows `Element | null` to `HTMLElement` (avoids a cast) and fails loudly. */
const closestElement = (element: Element, selector: string): HTMLElement => {
  const found = element.closest(selector);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`Expected an ancestor matching "${selector}"`);
  }
  return found;
};

/** The opt-in suggestions list. */
export const Default: Story = {};

/** Accepts one suggestion (→ Topic) and dismisses the other; asserts the list shrinks to empty. */
export const SuggestionsTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await waitFor(() => expect(canvas.getAllByTestId('topic-suggestion')).toHaveLength(2));

    const invoiceCard = closestElement(canvas.getByText('invoice acme'), '[data-testid="topic-suggestion"]');
    await userEvent.click(within(invoiceCard).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^accept$/i)));

    await waitFor(() => expect(canvas.getAllByTestId('topic-suggestion')).toHaveLength(1));
    void expect(canvas.queryByText('invoice acme')).toBeNull();

    const remaining = canvas.getByTestId('topic-suggestion');
    await userEvent.click(within(remaining).getByRole('button', { name: /action menu/i }));
    await userEvent.click(await waitFor(() => body.getByText(/^dismiss$/i)));

    await waitFor(() => expect(canvas.queryByTestId('topic-suggestion')).toBeNull());
    void expect(canvas.queryByText('welcome onboarding')).toBeNull();
  },
};
