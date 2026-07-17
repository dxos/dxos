//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useResolveRef, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';
import { Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { ConversationStack } from './ConversationStack';

type StoryArgs = {
  /** Number of messages seeded into the single fake thread. */
  length?: number;
};

/**
 * Renders the seeded mailbox's one thread through `ConversationStack` in isolation. The whole-thread
 * toolbar (view controls, collapse-all) belongs to `MessageArticle`, not the stack, so it is left out
 * here to keep the component's own surface — the message tiles and their per-message toolbars — clear.
 * Starts with every message collapsed; expand one by clicking its summary. (Deciding which message is
 * expanded by default — the most recent — is `MessageArticle`'s concern, exercised in its own story.)
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

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const handleExpandedChange = useCallback((id: string, isExpanded: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  if (!space?.db || !mailbox || messages.length === 0) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox, messages: messages.length }} />;
  }

  return (
    <Panel.Root role='article'>
      <Panel.Content asChild>
        <ConversationStack
          attendableId='story'
          items={messages}
          mailbox={mailbox}
          viewMode='html'
          expanded={expanded}
          onExpandedChange={handleExpandedChange}
          onContactCreate={() => {}}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/ConversationStack',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { length = 8 } }) => ({
      setupEvents: [AppActivationEvents.SetupSettings],
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

    // Everything starts collapsed: one summary card per message, and no per-message toolbars yet.
    const cards = await canvas.findAllByTestId('message.expand', undefined, { timeout: 12_000 });
    await expect(cards).toHaveLength(3);
    await expect(canvas.queryAllByRole('button', { name: 'Reply All' })).toHaveLength(0);

    // Expanding a message reveals its body and its own toolbar (Reply All).
    await userEvent.click(cards[cards.length - 1]);
    await waitFor(() => expect(canvas.getAllByRole('button', { name: 'Reply All' })).toHaveLength(1), {
      timeout: 5_000,
    });
  },
};
