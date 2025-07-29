//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType, type ContentBlock } from '@dxos/schema';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { ChatThread } from './ChatThread';
import { translations } from '../../translations';

faker.seed(1);

const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

const TEST_MESSAGES: DataType.Message[] = [
  createMessage('user', [
    {
      _tag: 'text',
      text: faker.lorem.sentence(5),
    } satisfies ContentBlock.Text,
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      disposition: 'cot',
      text: Array.from({ length: faker.number.int({ min: 3, max: 5 }) })
        .map((_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`)
        .join('\n'),
    },
    {
      _tag: 'text',
      text: Array.from({ length: faker.number.int({ min: 2, max: 5 }) })
        .map(() => faker.lorem.paragraphs())
        .join('\n\n'),
    },
    {
      _tag: 'toolCall',
      toolCallId: '1234',
      name: 'search',
      input: {},
    } satisfies ContentBlock.ToolCall,
  ]),

  createMessage('user', [
    {
      _tag: 'toolResult',
      toolCallId: '1234',
      name: 'search',
      result: 'This is a tool result.',
    } satisfies ContentBlock.ToolResult,
  ]),

  createMessage('assistant', [
    {
      _tag: 'toolCall',
      toolCallId: '4567',
      name: 'create',
      input: {},
    } satisfies ContentBlock.ToolCall,
  ]),

  createMessage('user', [
    {
      _tag: 'toolResult',
      toolCallId: '4567',
      name: 'create',
      result: 'This is a tool result.',
    } satisfies ContentBlock.ToolResult,
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      text: faker.lorem.paragraphs(1),
    } satisfies ContentBlock.Text,
  ]),

  createMessage('assistant', [
    {
      _tag: 'json',
      disposition: 'suggest',
      data: JSON.stringify({ text: 'Search...' }),
    },
    {
      _tag: 'json',
      disposition: 'suggest',
      data: JSON.stringify({ text: faker.lorem.paragraphs(1) }),
    } satisfies ContentBlock.Json,
  ]),
];

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout({ Container: ColumnContainer })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    messages: TEST_MESSAGES,
  },
} satisfies Story;

export const Incremental = {
  render: () => {
    const [messages, setMessages] = useState<DataType.Message[]>([]);
    useEffect(() => {
      let i = 0;
      const interval = setInterval(() => {
        setMessages((messages) => [...messages, TEST_MESSAGES[i++]]);
        if (i >= TEST_MESSAGES.length) {
          clearInterval(interval);
        }
      }, 2_000);

      return () => clearInterval(interval);
    }, []);

    return <ChatThread messages={messages} collapse />;
  },
} satisfies Story;
