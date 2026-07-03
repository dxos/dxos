//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { createMessages, getStoryMetadata } from '../testing';
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

const meta = {
  title: 'ui/react-ui-thread/Thread',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
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
