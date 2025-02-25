//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';
import translations from '../../translations';

faker.seed(1);

const Render = ({ messages: _messages, ...props }: ThreadProps) => {
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>(_messages ?? []);
  useEffect(() => {
    setMessages(_messages ?? []);
  }, [_messages]);

  const handleSubmit = useCallback(
    (text: string) => {
      const request: Message = { id: ObjectId.random(), role: 'user', content: [{ type: 'text', text }] };
      const response: Message = {
        id: ObjectId.random(),
        role: 'assistant',
        content: [{ type: 'text', disposition: 'cot', pending: true, text: faker.lorem.paragraphs(1) }],
      };
      setMessages([...messages, request, response]);
      setStreaming(true);
      setTimeout(() => {
        response.content[0].pending = false;
        setMessages([
          ...messages,
          request,
          response,
          {
            id: ObjectId.random(),
            role: 'assistant',
            content: [{ type: 'text', text: faker.lorem.paragraphs(1) }],
          },
        ]);
        setStreaming(false);
      }, 3_000);
    },
    [messages],
  );

  return (
    <div className='flex grow justify-center overflow-center bg-baseSurface'>
      <div className='flex w-[500px] bg-white dark:bg-black'>
        <Thread {...props} messages={messages} streaming={streaming} onSubmit={handleSubmit} onStop={() => {}} />
      </div>
    </div>
  );
};

const meta: Meta<ThreadProps> = {
  title: 'plugins/plugin-automation/Thread',
  render: Render,
  component: Thread,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true, tooltips: true })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<ThreadProps>;

const TEST_MESSAGES: Message[] = [
  {
    id: ObjectId.random(),
    role: 'user',
    content: [
      {
        type: 'text',
        text: faker.lorem.sentence(5),
      },
    ],
  },
  {
    id: ObjectId.random(),
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
  },
  {
    id: ObjectId.random(),
    role: 'user',
    content: [
      {
        type: 'tool_result',
        toolUseId: '1234',
        content: 'This is a tool result.',
      },
    ],
  },
  {
    id: ObjectId.random(),
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: '4567',
        name: 'create',
        input: {},
      },
    ],
  },
  {
    id: ObjectId.random(),
    role: 'user',
    content: [
      {
        type: 'tool_result',
        toolUseId: '4567',
        content: 'This is a tool result.',
      },
    ],
  },
  {
    id: ObjectId.random(),
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: faker.lorem.paragraphs(1),
      },
    ],
  },
];

export const Default: Story = {
  args: {
    // debug: true,
    messages: TEST_MESSAGES,
  },
};

export const Input: Story = {
  args: {
    streaming: true,
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

    return <Render messages={messages} collapse />;
  },
};
