//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useResolveRef, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';
import { Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MessageArticle } from './MessageArticle';

type StoryArgs = {
  /** Number of messages seeded into the single fake thread. */
  length?: number;
};

/**
 * Renders the seeded mailbox's one thread. Mirrors the `mailboxMessage` graph connector's query (one
 * combined space+feed scope, oldest-first) so a reply added at the db root (see `MessageArticle`'s
 * `openDraft`) is picked up reactively, exactly as it would be via the real companion node.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message))
          .from([Scope.space(), Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
          .orderBy(Order.property('created', 'asc'))
      : Query.select(Filter.nothing()),
  );

  if (!space?.db || !mailbox || messages.length === 0) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox, messages: messages.length }} />;
  }

  return <MessageArticle role='article' subject={messages} mailbox={mailbox} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MessageArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { length = 8 } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              // Thread pool of size 1 assigns every seeded message the same threadId — a single
              // conversation of exactly `length` messages, oldest to newest.
              yield* Effect.promise(() => initializeMailbox(personalSpace, length, 1));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    length: 8,
  },
};

export const Spec: Story = {
  args: {
    length: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for identity/client/mailbox seeding (all async) to finish and the thread to render.
    const replyButton = await canvas.findByRole('button', { name: 'Reply' }, { timeout: 12_000 });

    // Pressing Reply appends a draft composer inline at the bottom of the thread — no navigation.
    await userEvent.click(replyButton);
    await canvas.findByText('Draft', undefined, { timeout: 5_000 });
    await expect(await canvas.findAllByTestId('edit-email-form', undefined, { timeout: 5_000 })).toHaveLength(1);

    // Pressing Reply again appends a second draft — multiple drafts per thread are allowed.
    await userEvent.click(canvas.getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(canvas.getAllByTestId('edit-email-form')).toHaveLength(2), { timeout: 5_000 });
  },
};
