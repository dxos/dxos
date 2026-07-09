//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { Builder, MessagesOptions, initializeMailbox } from '#testing';
import { Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MessageStack, type MessageStackItem, MessageStackProps } from './MessageStack';

type DefaultStoryProps = MessageStackProps & {
  count?: number;
  options?: MessagesOptions;
  /** Group the generated messages by thread id, mirroring the mailbox's conversation query. */
  groupByThread?: boolean;
};

const DefaultStory = ({ count = 0, options, groupByThread, ...props }: DefaultStoryProps) => {
  const [items] = useState<MessageStackItem[] | undefined>(() => {
    if (!count) {
      return undefined;
    }
    const { messages } = new Builder().createMessages(count, options).build();
    if (!groupByThread) {
      return messages;
    }
    const groups = new Map<string, Message.Message[]>();
    for (const message of messages) {
      const key = message.threadId ?? message.id;
      const group = groups.get(key);
      if (group) {
        group.push(message);
      } else {
        groups.set(key, [message]);
      }
    }
    // Mirror the mailbox: each conversation card previews at most `THREAD_PREVIEW_COUNT` messages
    // and carries the full thread size as `total` so the card can render a "+N more" affordance.
    const THREAD_PREVIEW_COUNT = 4;
    return Array.from(groups, ([id, groupMessages]) => {
      const sorted = groupMessages.sort((a, b) => b.created.localeCompare(a.created));
      return {
        id,
        messages: sorted.slice(0, THREAD_PREVIEW_COUNT),
        total: sorted.length,
      };
    });
  });

  return <MessageStack {...props} items={items} />;
};

const CompanionStory = () => {
  const [space] = useSpaces();
  const db = useDatabase(space?.id);
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;

  // Selected message.
  const selected = useSelection(feed ? Obj.getURI(feed) : undefined, 'single');
  const message = useQuery(
    db,
    feed ? Query.select(selected ? Filter.id(selected) : Filter.nothing()).from(feed) : Query.select(Filter.nothing()),
  )[0];

  const mailboxData = useMemo(() => ({ subject: mailbox, attendableId: mailbox?.id ?? 'story' }), [mailbox]);
  const companionData = useMemo(
    () => ({ subject: message ?? 'message', attendableId: 'story-companion', companionTo: feed }),
    [message, feed],
  );

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(feed ? Obj.getURI(feed) : undefined);

  if (!db || !feed) {
    return <Loading data={{ db: !!db, feed: !!feed }} />;
  }

  return (
    <div {...attentionAttrs} className='grid grid-cols-[1fr_1fr]'>
      <Surface.Surface type={AppSurface.Article} data={mailboxData} />
      <Surface.Surface type={AppSurface.Article} data={companionData} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/MessageStack',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'story',
  },
};

export const WithMessages: Story = {
  args: {
    id: 'story',
    count: 100,
  },
};

export const WithConversations: Story = {
  args: {
    id: 'story',
    groupByThread: true,
    count: 100,
    options: {
      threads: 10,
    },
  },
};

export const WithCompanion = {
  render: CompanionStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              // TODO(wittjosiah): Share message builder with transcription stories. Factor out to @dxos/schema/testing.
              const mailbox = yield* Effect.promise(() => initializeMailbox(personalSpace));
              log.info('mailbox', { id: mailbox.id });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    }),
  ],
};
