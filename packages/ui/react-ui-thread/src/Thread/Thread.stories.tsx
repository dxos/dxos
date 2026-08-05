//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, within } from 'storybook/test';

import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import {
  createConversationFixture,
  createGroupedMessages,
  createMessages,
  createMixedSenderMessages,
  getStoryMetadata,
} from '../testing';
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

// Reproduces a report that the local identity's own sent messages don't appear: renders one
// message from each of three sender shapes to check whether the render path drops any of them.
const MixedSendersStory = () => {
  const messages = useMemo(() => createMixedSenderMessages(), []);
  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid={IDENTITY.identityDid} editable={false}>
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
      </Thread.Content>
    </Thread.Root>
  );
};

// Exercises message grouping and both divider kinds.
const GroupedStory = () => {
  const messages = useMemo(() => createGroupedMessages(), []);
  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid={IDENTITY.identityDid} editable={false}>
      <Thread.Content classNames='grow min-h-0'>
        <Thread.Messages messages={messages} />
      </Thread.Content>
    </Thread.Root>
  );
};

/**
 * Every state a message can be rendered in, as one conversation. Reactions and threads are
 * host-provided — the fixture answers `getReactions`/`getThreadSummary` from static maps, so the
 * whole gallery renders without a database.
 */
const ConversationStory = () => {
  const { messages, reactions, threads } = useMemo(() => createConversationFixture(), []);

  const getReactions = useCallback((message: MessageType.Message) => reactions.get(message.id) ?? [], [reactions]);
  const getThreadSummary = useCallback((message: MessageType.Message) => threads.get(message.id), [threads]);
  const canDelete = useCallback(
    (message: MessageType.Message) => message.sender.identityDid === IDENTITY.identityDid,
    [],
  );

  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      getReactions={getReactions}
      getThreadSummary={getThreadSummary}
      canDelete={canDelete}
      identityDid={IDENTITY.identityDid}
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
