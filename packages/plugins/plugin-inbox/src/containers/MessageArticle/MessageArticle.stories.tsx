//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Loading, TestGrid, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { InboxPlugin } from '#plugin';
import { initializeMailbox, seedSummaries } from '#testing';
import { Mailbox } from '#types';

import { MessageArticle } from './MessageArticle';

const ATTENDABLE_ID = 'story';

type StoryArgs = {
  /** Number of messages seeded into the single fake thread. */
  length?: number;
};

/** Plain projection of the selected message — the live proxy carries internals that add noise. */
const messageJson = (message: Message.Message, summary?: string) => ({
  id: message.id,
  created: message.created,
  threadId: message.threadId,
  parentMessage: message.parentMessage,
  sender: message.sender,
  properties: message.properties,
  blocks: message.blocks.map((block) =>
    block._tag === 'text'
      ? { _tag: block._tag, disposition: block.disposition, length: block.text.length }
      : { _tag: block._tag },
  ),
  summary,
});

/**
 * Renders the seeded mailbox's one thread from its most recent message, the way the `mailboxMessage`
 * graph connector opens one: the article looks the conversation up itself, so a reply added at the db
 * root (see `MessageArticle`'s `openDraft`) is picked up reactively.
 *
 * Two columns: the article, and the JSON of the selected message beside it, so what the article
 * displays can be read against the object behind it — summaries in particular come from a separate
 * annotation feed rather than from the message.
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

  // Summaries live on the mailbox's annotation feed, keyed by `parentMessage`, so the JSON shows
  // everything the article knows about the message rather than just the message object.
  // TODO(wittjosiah): This additional hook call shouldn't be necessary, useResolveRef should handle this case.
  useObject(mailbox, 'annotations');
  const annotationsFeed = useResolveRef(mailbox?.annotations);
  const annotations = useQuery(
    space?.db,
    annotationsFeed
      ? Query.select(Filter.type(Message.Message)).from([
          Scope.feed(Obj.getURI(annotationsFeed, { prefer: 'absolute' })),
        ])
      : Query.select(Filter.nothing()),
  );
  const summaries = useMemo(() => Mailbox.summaryIndex(annotations), [annotations]);

  // The conversation stack publishes no per-tile selection yet (PLAN.md phase 5 — `useSelected` /
  // `AttentionOperation.Select` semantics are still unsettled), so this falls back to the message the
  // article was opened for: the subject it renders the thread around.
  const selectedId = useSelection(ATTENDABLE_ID, 'single');
  const subject = messages[messages.length - 1];
  const selected = messages.find((message) => message.id === selectedId) ?? subject;

  if (!space?.db || !mailbox || messages.length === 0) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox, messages: messages.length }} />;
  }

  return (
    <TestGrid.Root>
      <TestGrid.Stack>
        <TestGrid.Panel>
          <MessageArticle role='article' subject={subject} mailbox={mailbox} attendableId={ATTENDABLE_ID} />
        </TestGrid.Panel>
        <TestGrid.Panel>
          <JsonHighlighter data={messageJson(selected, summaries.get(selected.id))} />
        </TestGrid.Panel>
      </TestGrid.Stack>
    </TestGrid.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MessageArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { length = 8 } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              // Thread pool of size 1 assigns every seeded message the same threadId — a single
              // conversation of exactly `length` messages, oldest to newest.
              const mailbox = yield* Effect.promise(() => initializeMailbox(defaultSpace.db, length, 1));
              // Half the conversation carries a derived summary, so the summary tile renders from a
              // realistic mix (the tile shows the newest summarized message, not every one).
              yield* Effect.promise(() => seedSummaries(defaultSpace.db, mailbox));
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin.make({}),
        InboxPlugin(),
        PreviewPlugin.make(),
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

    // Wait for identity/client/mailbox seeding (all async) to finish and the thread to render. The
    // article looks the conversation up by threadId, so the two older messages appear as collapsed
    // summaries only once that query resolves; the opened (most recent) message is the one expanded, so
    // exactly one Reply All shows.
    const replyButtons = await canvas.findAllByRole('button', { name: 'Reply All' }, { timeout: 12_000 });
    await expect(replyButtons).toHaveLength(1);
    await waitFor(() => expect(canvas.getAllByTestId('message.expand')).toHaveLength(2), { timeout: 5_000 });

    // The conversation's summary is its own tile at the bottom of the stack (not repeated inside the
    // expanded message), sourced from the newest summarized message in the thread.
    const summaryTile = await canvas.findByTestId('conversation.summary', undefined, { timeout: 5_000 });
    await expect(summaryTile).toHaveTextContent(/waiting on a reply/);

    // Reply All on the newest message appends a draft composer inline at the bottom — no navigation.
    await userEvent.click(replyButtons[0]);
    await canvas.findByText('Draft', undefined, { timeout: 5_000 });
    await expect(await canvas.findAllByTestId('edit-email-form', undefined, { timeout: 5_000 })).toHaveLength(1);

    // Pressing it again appends a second draft — multiple drafts per thread are allowed.
    await userEvent.click(canvas.getByRole('button', { name: 'Reply All' }));
    await waitFor(() => expect(canvas.getAllByTestId('edit-email-form')).toHaveLength(2), { timeout: 5_000 });
  },
};
