//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { Message } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { ChatThread, type ChatThreadProps } from './ChatThread';
import { translations } from '../../translations';

faker.seed(1);

const DefaultStory = ({ messages: _messages, ...props }: ChatThreadProps) => {
  const [messages, setMessages] = useState<Message[]>(_messages ?? []);
  useEffect(() => {
    setMessages(_messages ?? []);
  }, [_messages]);

  const [processing, setProcessing] = useState(false);
  const handleSubmit = useCallback(
    (text: string) => {
      const request: Message = Obj.make(Message, { role: 'user', content: [{ type: 'text', text }] });
      const response: Message = Obj.make(Message, {
        role: 'assistant',
        content: [{ type: 'text', disposition: 'cot', pending: true, text: faker.lorem.paragraphs(1) }],
      });
      setMessages([...messages, request, response]);
      setProcessing(true);
      setTimeout(() => {
        response.content[0].pending = false;
        setMessages([
          ...messages,
          request,
          response,
          Obj.make(Message, {
            role: 'assistant',
            content: [{ type: 'text', text: faker.lorem.paragraphs(1) }],
          }),
        ]);
        setProcessing(false);
      }, 3_000);
    },
    [messages],
  );

  return <ChatThread {...props} messages={messages} />;
};

const meta: Meta<ChatThreadProps> = {
  title: 'plugins/plugin-assistant/ChatThread',
  render: DefaultStory,
  component: ChatThread,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout({ Container: ColumnContainer })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<ChatThreadProps>;

const TEST_MESSAGES: Message[] = [
  Obj.make(Message, {
    role: 'user',
    content: [
      {
        type: 'text',
        text: faker.lorem.sentence(5),
      },
    ],
  }),
  Obj.make(Message, {
    role: 'assistant',
    content: [
      {
        type: 'text',
        disposition: 'cot',
        text: Array.from({ length: faker.number.int({ min: 3, max: 5 }) })
          .map((_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`)
          .join('\n'),
      },
      {
        type: 'text',
        text: Array.from({ length: faker.number.int({ min: 2, max: 5 }) })
          .map(() => faker.lorem.paragraphs())
          .join('\n\n'),
      },
      {
        type: 'tool_use',
        id: '1234',
        name: 'search',
        input: {},
      },
    ],
  }),
  Obj.make(Message, {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        toolUseId: '1234',
        content: 'This is a tool result.',
      },
    ],
  }),
  Obj.make(Message, {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: '4567',
        name: 'create',
        input: {},
      },
    ],
  }),
  Obj.make(Message, {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        toolUseId: '4567',
        content: 'This is a tool result.',
      },
    ],
  }),
  Obj.make(Message, {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: faker.lorem.paragraphs(1),
      },
    ],
  }),
];

export const Default: Story = {
  args: {
    messages: TEST_MESSAGES,
  },
};

export const Collapse: Story = {
  args: {
    collapse: true,
    messages: TEST_MESSAGES,
  },
};

export const Incremental: Story = {
  render: () => {
    const [messages, setMessages] = useState<Message[]>([]);
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

    return <DefaultStory messages={messages} collapse />;
  },
};
