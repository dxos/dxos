//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter, Order, Query } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookCapabilities, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';
import { InboxCapabilities, Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MailboxArticle } from './MailboxArticle';

// `showItem` (in the 'storybook' layout mode) dispatches `LayoutOperation.UpdateCompanion` after
// `Select`; `Select` is handled by AttentionPlugin (writes the selection this story reads), but no
// installed plugin handles `UpdateCompanion` (that is DeckPlugin's), so stub it as a no-op. Mirrors
// the `stories-inbox` MailboxSync playground.
const MockDeckOperationsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mockDeckOperations'),
    name: 'Mock Deck Ops',
  }),
).pipe(
  AppPlugin.addOperationHandlerModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
        ),
      ),
  }),
  Plugin.make,
);

type StoryArgs = {
  /** Number of messages to seed. */
  count?: number;
  /** Size of the thread-id pool messages are randomly assigned to (fewer → larger conversations). */
  threads?: number;
  /** Force conversation grouping on/off; when omitted, the persisted/product-default value applies. */
  conversations?: boolean;
};

const DefaultStory = ({ conversations }: StoryArgs) => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));

  // Force the conversation-grouping setting per-variant, independent of any persisted value.
  const settingsAtom = useCapability(InboxCapabilities.Settings);
  const setSettings = useAtomSet(settingsAtom);
  useEffect(() => {
    if (conversations !== undefined) {
      setSettings((settings) => ({ ...settings, conversations }));
    }
  }, [conversations, setSettings]);

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return <MailboxArticle role='article' subject={mailbox} attendableId='story' />;
};

// Shared attention context for the mailbox pane and its message companion.
const MAILBOX_CONTEXT_ID = 'story';

/**
 * The mailbox article beside its message-article companion — the master/detail layout the deck renders
 * in-app. Selecting a message in the mailbox pane opens it in the companion: `MailboxArticle` dispatches
 * `LayoutOperation.Select` (handled by AttentionPlugin) which updates the shared selection view-state
 * this story reads back via {@link useSelection}. Mirrors the `stories-inbox` MailboxSync playground.
 */
const CompanionStory = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);

  // Surfaces resolve the active space from the layout workspace path; StorybookPlugin defaults it to
  // 'default', so point it at the seeded space (mirrors the MailboxSync playground).
  const layoutState = useCapability(StorybookCapabilities.LayoutState);
  const setLayout = useAtomSet(layoutState);
  useEffect(() => {
    if (space) {
      setLayout((state) => ({ ...state, workspace: Paths.getSpacePath(space.id) }));
    }
  }, [space, setLayout]);
  const messages = useQuery(
    db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );

  // Follow the mailbox pane's selection: `MailboxArticle` writes it under MAILBOX_CONTEXT_ID via
  // `LayoutOperation.Select`. The companion opens the selected message's whole conversation, mirroring
  // the app's `mailboxMessage` connector: messages sharing the `threadId` in chronological (oldest-first)
  // order; a message without a `threadId` is a one-message thread.
  const selectedId = useSelection(MAILBOX_CONTEXT_ID, 'single');
  const selected = messages.find((candidate) => candidate.id === selectedId);
  const thread = selected
    ? selected.threadId
      ? messages
          .filter((candidate) => candidate.threadId === selected.threadId)
          .sort((a, b) => a.created.localeCompare(b.created))
      : [selected]
    : [];

  const attentionAttrs = useAttentionAttributes(MAILBOX_CONTEXT_ID);

  if (!db || !mailbox) {
    return <Loading data={{ db: !!db, mailbox: !!mailbox }} />;
  }

  return (
    <Panel.Root>
      <Panel.Content className='dx-container grid grid-cols-[1fr_1fr]' {...attentionAttrs}>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: mailbox, attendableId: MAILBOX_CONTEXT_ID }}
          limit={1}
        />
        {thread.length > 0 ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: thread, companionTo: mailbox, attendableId: MAILBOX_CONTEXT_ID }}
            limit={1}
          />
        ) : (
          <div className='grid place-items-center text-description'>Select a message</div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MailboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { count = 0, threads = 10 } }) => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => initializeMailbox(personalSpace, count, threads));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),

        SpacePlugin({}),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
        MockDeckOperationsPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Both variants force the setting explicitly: the settings store persists across runs, so an
// omitted value would inherit whatever a prior session wrote rather than the product default.
export const Default: Story = {
  args: {
    count: 500,
    // A thread pool comfortably larger than the page size (10 conversations) so scrolling
    // exercises group-level pagination — with the default pool of 10 everything fits on one page.
    threads: 100,
    conversations: true,
  },
};

export const Flat: Story = {
  args: {
    count: 500,
    conversations: false,
  },
};

export const Empty: Story = {
  args: {
    count: 0,
  },
};

// Master/detail: the mailbox article beside the message-article companion (a message is pre-selected).
export const WithCompanion: Story = {
  render: () => <CompanionStory />,
  args: {
    count: 100,
    threads: 20,
  },
  decorators: [withLayout({ layout: 'fullscreen' })],
};
