//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { Builder, MessagesOptions } from '#testing';

import { MessageStack, type MessageStackItem, MessageStackProps } from './MessageStack';

type DefaultStoryProps = MessageStackProps & {
  count?: number;
  options?: MessagesOptions;
  /** Group the generated messages by thread id, mirroring the mailbox's conversation query. */
  groupByThread?: boolean;
};

const DefaultStory = ({ count = 0, options, groupByThread, ...props }: DefaultStoryProps) => {
  const [{ items, unreadIds }] = useState<{ items: MessageStackItem[] | undefined; unreadIds: ReadonlySet<string> }>(
    () => {
      if (!count) {
        return { items: undefined, unreadIds: new Set() };
      }
      const { messages } = new Builder().createMessages(count, options).build();
      // Demonstrate the new-message indicator by marking roughly every third message unread.
      const unreadIds = new Set(messages.filter((_, index) => index % 3 === 0).map((message) => message.id));
      if (!groupByThread) {
        return { items: messages, unreadIds };
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
      const items = Array.from(groups, ([id, groupMessages]) => {
        const sorted = groupMessages.sort((a, b) => b.created.localeCompare(a.created));
        return {
          id,
          messages: sorted.slice(0, THREAD_PREVIEW_COUNT),
          total: sorted.length,
        };
      });
      return { items, unreadIds };
    },
  );

  const unreadAtom = useMemo(() => Atom.family((id: string) => Atom.make(() => unreadIds.has(id))), [unreadIds]);

  return <MessageStack {...props} items={items} unreadAtom={unreadAtom} />;
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
