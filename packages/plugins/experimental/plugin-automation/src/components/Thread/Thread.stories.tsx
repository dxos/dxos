//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';
import translations from '../../translations';

faker.seed(2);

const Render = ({ messages: _messages, ...props }: ThreadProps) => {
  const [messages, setMessages] = useState<Message[]>(_messages ?? []);

  const handleSubmit = useCallback(
    (message: string) => {
      setMessages([...messages, { id: ObjectId.random(), role: 'user', content: [{ type: 'text', text: message }] }]);
    },
    [messages],
  );

  return (
    <div className='flex grow justify-center overflow-center bg-base'>
      <div className='flex w-[500px] bg-white dark:bg-black'>
        <Thread {...props} messages={messages} onSubmit={handleSubmit} />
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
        text: 'hello',
      },
    ],
  },
  {
    id: ObjectId.random(),
    role: 'assistant',
    content: [
      {
        type: 'text',
        pending: true,
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
        type: 'text',
        text: faker.lorem.paragraphs(1),
      },
    ],
  },
];

export const Default: Story = {
  args: {
    messages: TEST_MESSAGES,
  },
};

export const Input: Story = {
  args: {
    streaming: true,
  },
};
