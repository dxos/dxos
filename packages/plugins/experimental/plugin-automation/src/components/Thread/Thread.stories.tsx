//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';

faker.seed(0);

const Render = ({ messages: _messages, ...props }: ThreadProps) => {
  const [messages, setMessages] = useState(_messages);
  useEffect(() => {
    const message: Message = {
      id: ObjectId.random(),
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: '',
        },
      ],
    };

    const i = setInterval(() => {
      const block = message.content[0];
      invariant(block.type === 'text');
      block.text += ' ' + faker.lorem.word();
      setMessages([..._messages, message]);
    }, 200);

    return () => clearInterval(i);
  }, []);

  return (
    <div className='flex grow justify-center overflow-center bg-white dark:bg-black'>
      <div className='flex w-[500px] bg-base'>
        <Thread {...props} messages={messages} />
      </div>
    </div>
  );
};

const meta: Meta<ThreadProps> = {
  title: 'plugins/plugin-automation/Thread',
  render: Render,
  component: Thread,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true, tooltips: true })],
};

export default meta;

type Story = StoryObj<ThreadProps>;

export const Default: Story = {
  args: {
    streaming: true,
    messages: [
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
      // {
      //   id: ObjectId.random(),
      //   role: 'assistant',
      //   content: [
      //     {
      //       type: 'text',
      //       disposition: 'cot',
      //       text: ['1. Consider the question.', '2. Plan the route.', '3. Plot the course.'].join('\n'),
      //     },
      //     {
      //       type: 'text',
      //       text: 'Things',
      //     },
      //     {
      //       type: 'json',
      //       json: '{}',
      //     },
      //   ],
      // },
    ],
  },
};

export const Line = {
  render: () => {
    const [lines, setLines] = useState<string[]>([]);
    const [expanded, setExpanded] = useState(false);
    return (
      <div className='flex grow justify-center overflow-center bg-white dark:bg-black'>
        <div className='flex flex-col w-[500px] bg-base'>
          <Toolbar.Root>
            <IconButton
              icon='ph--plus--regular'
              label='Add'
              iconOnly
              onClick={() => {
                setLines((lines) => [...lines, faker.lorem.sentence(5)]);
                // setExpanded((expanded) => !expanded);
              }}
            />
          </Toolbar.Root>
          <div>
            {lines.map((line, i) => (
              <div key={i} className='flex h-[32px] p-1 px-3 items-center'>
                {line}
              </div>
            ))}
          </div>
          <div
            className={mx(
              'flex flex-col justify-end p-1 items-center h-[40px] transition-h duration-[250ms]',
              expanded && 'h-[72px]',
            )}
          >
            <Input.Root>
              <Input.TextInput placeholder='Enter message...' />
            </Input.Root>
          </div>
        </div>
      </div>
    );
  },
};
