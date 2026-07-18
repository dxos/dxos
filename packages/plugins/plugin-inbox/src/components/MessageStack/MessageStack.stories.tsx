//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { Builder, MessagesOptions } from '#testing';
import { Mailbox } from '#types';

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
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;

  // Selected message.
  const selected = useSelection(feed ? Obj.getURI(feed) : undefined, 'single');
  const message = useQuery(
    space?.db,
    feed ? Query.select(selected ? Filter.id(selected) : Filter.nothing()).from(feed) : Query.select(Filter.nothing()),
  )[0];

  const mailboxData = useMemo(() => ({ subject: mailbox, attendableId: mailbox?.id ?? 'story' }), [mailbox]);
  const companionData = useMemo(
    () => ({ subject: message ?? 'message', attendableId: 'story-companion', companionTo: feed }),
    [message, feed],
  );

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(feed ? Obj.getURI(feed) : undefined);

  if (!space?.db || !feed) {
    return <Loading data={{ db: !!space?.db, feed: !!feed }} />;
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
    count: 100,
    groupByThread: true,
    options: {
      threads: 10,
    },
  },
};
