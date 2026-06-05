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
      <Thread.Messages messages={messages} />
      <Thread.Textbox id='composer' authorId={IDENTITY.identityDid} authorName={IDENTITY.name} onSend={handleSend} />
      <Thread.Status />
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
