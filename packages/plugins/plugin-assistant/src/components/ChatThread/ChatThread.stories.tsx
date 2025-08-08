//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { type ContentBlock, DataType } from '@dxos/schema';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { ChatThread } from './ChatThread';

faker.seed(1);

const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

// TODO(burdon): References.

const TEST_MESSAGES: DataType.Message[] = [
  createMessage('user', [
    {
      _tag: 'text',
      text: faker.lorem.sentence(5),
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      text: faker.lorem.paragraphs(1),
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'suggest',
      text: 'Search...',
    },
    {
      _tag: 'suggest',
      text: faker.lorem.paragraphs(1),
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      text: 'Select an option:',
    },
    {
      _tag: 'select',
      options: ['Option 1', 'Option 2', 'Option 3'],
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      text: faker.lorem.paragraphs(1),
    },
    {
      _tag: 'toolkit',
    },
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
    },
  ]),

  createMessage('user', [
    {
      _tag: 'toolResult',
      toolCallId: '1234',
      name: 'search',
      result: 'This is a tool result.',
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'toolCall',
      toolCallId: '4567',
      name: 'create',
      input: {},
    },
  ]),

  createMessage('user', [
    {
      _tag: 'toolResult',
      toolCallId: '4567',
      name: 'create',
      result: 'This is a tool result.',
    },
  ]),

  createMessage('assistant', [
    {
      _tag: 'text',
      text: faker.lorem.paragraphs(1),
    },
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
    onEvent: (event) => console.log(event),
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

    return <ChatThread messages={messages} collapse onEvent={(event) => console.log(event)} />;
  },
} satisfies Story;
