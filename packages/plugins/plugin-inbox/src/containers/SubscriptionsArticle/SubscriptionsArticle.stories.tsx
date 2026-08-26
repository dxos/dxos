//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { InboxPlugin } from '#plugin';
import { Mailbox } from '#types';

import { SubscriptionsArticle } from './SubscriptionsArticle';

/** Bulk-mail senders with a `List-Unsubscribe` affordance; counts drive the noisiest-first sort. */
const SENDERS: { email: string; name: string; count: number }[] = [
  { email: 'digest@daily-news.io', name: 'Daily News', count: 5 },
  { email: 'updates@shipfast.dev', name: 'ShipFast', count: 3 },
  { email: 'offers@bigbox.store', name: 'BigBox Offers', count: 3 },
  { email: 'newsletter@quietreads.org', name: 'Quiet Reads', count: 1 },
];

const DefaultStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  if (!mailbox) {
    return <Loading />;
  }

  return <SubscriptionsArticle role='article' subject={mailbox} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/SubscriptionsArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        InboxPlugin(),
        ClientPlugin.make({
          types: [Mailbox.Mailbox, Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const mailbox = defaultSpace.db.add(Mailbox.make());
              const feed = yield* Effect.promise(async () => mailbox.feed?.tryLoad());
              if (!feed) {
                throw new Error('Mailbox missing backing feed');
              }
              const messages = SENDERS.flatMap(({ email, name, count }, senderIndex) =>
                Array.from({ length: count }, (_, message) =>
                  Message.make({
                    created: new Date().toISOString(),
                    sender: { email, name },
                    blocks: [{ _tag: 'text', text: `Bulk mail ${message + 1} from ${name}.` }],
                    properties: {
                      subject: `Update #${message + 1}`,
                      listUnsubscribe: `<https://example.com/u/${senderIndex}>`,
                    },
                  }),
                ),
              );
              yield* Feed.append(feed, messages).pipe(Effect.provide(Database.layer(defaultSpace.db)));
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. The list shows four senders, noisiest first: Daily News (5), then BigBox Offers and ShipFast
 *    (3 each, alphabetical), then Quiet Reads (1).
 * 2. Type "ship" in the toolbar filter. Only ShipFast remains; clear the filter and all four return.
 * 3. Type "zzz". The "No matching subscriptions." empty state shows.
 * 4. Check a sender's checkbox — the toolbar Remove button enables and shows the count.
 */
export const Default: Story = {};
