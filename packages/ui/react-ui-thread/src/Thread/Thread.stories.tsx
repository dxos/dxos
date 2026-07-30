//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, within } from 'storybook/test';

import { Ref } from '@dxos/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { createMessages, getStoryMetadata } from '../testing';
import { type MessageReaction, type MessageThreadSummary } from '../types';
import { Thread } from './Thread';

const IDENTITY = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };

const DefaultStory = () => {
  const [messages, setMessages] = useState(() => createMessages(12));

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, MessageType.make({ sender: IDENTITY, blocks: [{ _tag: 'text', text }] })]);
    return true;
  };

  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid={IDENTITY.identityDid} editable onMessageDelete={() => {}}>
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
        <Thread.Textbox id='composer' authorId={IDENTITY.identityDid} authorName={IDENTITY.name} onSend={handleSend} />
        <Thread.Status />
      </Thread.Content>
    </Thread.Root>
  );
};

// Reproduces a report that the local identity's own sent messages don't
// appear: renders one message from each of three sender shapes — the local
// identity (matches `Thread.Root`'s `identityDid`), a name-only sender with
// no `identityDid` (e.g. an externally-synced guest, like freeq before
// `echo-message`), and a different identity — to check whether the render
// path itself drops any of them.
const MixedSendersStory = () => {
  const messages = [
    MessageType.make({
      sender: { role: 'user', identityDid: 'did:key:alice', name: 'Alice' },
      blocks: [{ _tag: 'text', text: 'Message from the local identity (Alice).' }],
    }),
    MessageType.make({
      sender: { name: 'guest' },
      blocks: [{ _tag: 'text', text: 'Message from a name-only sender (guest), no identityDid.' }],
    }),
    MessageType.make({
      sender: { role: 'user', identityDid: 'did:key:bob', name: 'Bob' },
      blocks: [{ _tag: 'text', text: 'Message from a different identity (Bob).' }],
    }),
  ];

  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid={IDENTITY.identityDid} editable={false}>
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
      </Thread.Content>
    </Thread.Root>
  );
};

// Exercises message grouping (consecutive same-sender messages within the
// default 60s window merge into one tile) and both divider kinds: a labeled
// day divider before each calendar day's first message, and a plain (gap)
// divider for a same-day silence over the default 3h threshold.
const GroupedStory = () => {
  const day1 = new Date('2026-07-01T09:00:00.000Z').getTime();
  const day2 = new Date('2026-07-02T09:00:00.000Z').getTime();
  const alice = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };
  const bob = { role: 'user' as const, identityDid: 'did:key:bob', name: 'Bob' };

  const at = (time: number, sender: typeof alice | typeof bob, text: string) =>
    MessageType.make({ created: new Date(time).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

  const messages = [
    // Same-sender burst within the 60s grouping window: one group, three bodies.
    at(day1, alice, 'First message in a burst.'),
    at(day1 + 10_000, alice, 'Second message, 10s later — same group.'),
    at(day1 + 40_000, alice, 'Third message, 40s after the first — still same group.'),
    // >60s gap, same sender: starts a new group (no divider — gap is well under 3h).
    at(day1 + 120_000, alice, 'New group: 2 minutes after the burst.'),
    // >3h gap, same day: plain (unlabeled) divider, new group.
    at(day1 + 120_000 + 4 * 60 * 60 * 1000, alice, 'After a 4-hour silence — gap divider above.'),
    // Different sender: always starts a new group even within the window.
    at(day1 + 120_000 + 4 * 60 * 60 * 1000 + 5_000, bob, 'Bob replies 5s later — different sender, new group.'),
    // Next calendar day: labeled day divider, new group (day boundary wins over gap boundary).
    at(day2, bob, 'A new day.'),
  ];

  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid={IDENTITY.identityDid} editable={false}>
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
      </Thread.Content>
    </Thread.Root>
  );
};

/**
 * Every state a message can be rendered in, as one conversation: plain and grouped, reacted (one
 * emoji, several, one inside a group), quote-replying (alone and in a run), carrying a thread (a single
 * reply, a busy named one, one inside a group), and long-form. Reactions and threads are host-provided
 * — the fixture answers `getReactions`/`getThreadSummary` from static maps, so the whole gallery renders
 * without a database.
 */
const ConversationStory = () => {
  const alice = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };
  const bob = { role: 'user' as const, identityDid: 'did:key:bob', name: 'Bob' };
  const carol = { role: 'user' as const, identityDid: 'did:key:carol', name: 'Carol' };

  const { messages, reactions, threads } = useMemo(() => {
    const base = new Date('2026-07-30T09:00:00.000Z').getTime();
    let offset = 0;
    // Default gap starts a new group (over the 60s window); `10_000` continues the run above it.
    const at = (
      sender: typeof alice,
      text: string,
      { gap = 5 * 60_000, parentMessage }: { gap?: number; parentMessage?: MessageType.Message } = {},
    ) => {
      offset += gap;
      return MessageType.make({
        created: new Date(base + offset).toISOString(),
        sender,
        blocks: [{ _tag: 'text', text }],
        ...(parentMessage ? { parentMessage: Ref.make(parentMessage) } : {}),
      });
    };

    const reactions = new Map<string, MessageReaction[]>();
    const threads = new Map<string, MessageThreadSummary>();

    const single = at(bob, 'A single message from another sender.');
    const own = at(alice, 'A single message of my own — mine alone can be edited or deleted.');

    const groupHead = at(carol, 'A run of messages from one sender…');
    const groupMiddle = at(carol, '…grouped under a single avatar…', { gap: 10_000 });
    const groupTail = at(carol, '…each row still carrying its own controls.', { gap: 10_000 });

    const reactedOnce = at(bob, 'Reacted to once.');
    reactions.set(reactedOnce.id, [{ emoji: '👍', count: 1, self: false }]);

    const reactedOften = at(bob, 'Reacted to several ways, one of them mine.');
    reactions.set(reactedOften.id, [
      { emoji: '👍', count: 3, self: true },
      { emoji: '🎉', count: 2, self: false },
      { emoji: '❤️', count: 1, self: false },
    ]);

    const reactedGroupHead = at(carol, 'First of a run…');
    const reactedGroupTail = at(carol, '…and the reaction belongs to the second, not the first.', { gap: 10_000 });
    reactions.set(reactedGroupTail.id, [{ emoji: '👀', count: 1, self: true }]);

    const quoted = at(alice, 'Quote-replying to a message above.', { parentMessage: reactedOften });
    const quotedRunHead = at(bob, 'Two quote-replies in a row…', { parentMessage: own });
    const quotedRunTail = at(bob, '…each quoting a different message.', { gap: 10_000, parentMessage: single });

    const threadOne = at(bob, 'Has a thread with a single reply.');
    threads.set(threadOne.id, { replyCount: 1, lastActivity: new Date(base + offset + 60_000).toISOString() });

    const threadMany = at(carol, 'Has a busy, named thread.');
    threads.set(threadMany.id, {
      replyCount: 24,
      name: 'Release plan',
      lastActivity: new Date(base + offset + 45 * 60_000).toISOString(),
    });

    const threadGroupHead = at(alice, 'First of a run…');
    const threadGroupTail = at(alice, '…and the thread hangs off the second one.', { gap: 10_000 });
    threads.set(threadGroupTail.id, { replyCount: 3, lastActivity: new Date(base + offset + 120_000).toISOString() });

    const long = at(
      bob,
      'A longer message, to show how a paragraph wraps against the avatar rail and how the hover ' +
        'controls sit beside it: lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do ' +
        'eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    );

    return {
      messages: [
        single,
        own,
        groupHead,
        groupMiddle,
        groupTail,
        reactedOnce,
        reactedOften,
        reactedGroupHead,
        reactedGroupTail,
        quoted,
        quotedRunHead,
        quotedRunTail,
        threadOne,
        threadMany,
        threadGroupHead,
        threadGroupTail,
        long,
      ],
      reactions,
      threads,
    };
  }, []);

  const getReactions = useCallback((message: MessageType.Message) => reactions.get(message.id) ?? [], [reactions]);
  const getThreadSummary = useCallback((message: MessageType.Message) => threads.get(message.id), [threads]);
  const canDelete = useCallback((message: MessageType.Message) => message.sender.identityDid === alice.identityDid, []);

  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      getReactions={getReactions}
      getThreadSummary={getThreadSummary}
      canDelete={canDelete}
      identityDid={alice.identityDid}
      editable
      onMessageReact={() => {}}
      onMessageDelete={() => {}}
      onThreadOpen={() => {}}
      onThreadCreate={() => {}}
    >
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
      </Thread.Content>
    </Thread.Root>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Thread',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withMosaic()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MixedSenders: Story = {
  render: MixedSendersStory,
};

export const Grouped: Story = {
  render: GroupedStory,
};

export const Conversation: Story = {
  render: ConversationStory,
  // Asserts the gallery covers what it claims — and that a quote resolves from a `Ref` to an object
  // that was never persisted, which is what lets the whole fixture run without a database.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // `findAllByText`: this message is also quoted further down, so its text renders twice.
    await expect((await canvas.findAllByText('A single message from another sender.'))[0]).toBeVisible();

    // One pill on each singly-reacted message, three on the one reacted several ways.
    await expect(await canvas.findAllByTestId('thread.message.reaction')).toHaveLength(5);
    await expect(await canvas.findAllByTestId('thread.message.quote')).toHaveLength(3);
    // A summary row per threaded message, and the named thread shows its name.
    await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(3);
    await expect(await canvas.findByText('Release plan')).toBeVisible();
  },
};
