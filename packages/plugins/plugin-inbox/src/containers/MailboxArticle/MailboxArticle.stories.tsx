//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Feed, Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { initializeMailbox } from '#testing';
import { InboxCapabilities, Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MailboxArticle } from './MailboxArticle';

// No-op handlers for layout operations invoked from article components; avoids pulling in DeckPlugin.
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
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.Select, () => Effect.void),
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          ),
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
