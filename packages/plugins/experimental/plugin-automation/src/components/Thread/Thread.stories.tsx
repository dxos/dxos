//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';

faker.seed(0);

const Render = ({ messages, ...props }: ThreadProps) => {
  return (
    <div className='flex grow justify-center overflow-center bg-base'>
      <div className='flex w-[500px] bg-white dark:bg-black'>
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
      {
        id: ObjectId.random(),
        role: 'assistant',
        content: [
          {
            type: 'text',
            disposition: 'cot',
            text: ['1. Consider the question and context.', '2. Plan the route.', '3. Plot the course.'].join('\n'),
          },
          {
            type: 'text',
            text: 'This is a long text block.',
          },
          {
            type: 'tool_use',
            id: 'tool-use-1',
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
            toolUseId: 'tool-use-1',
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
            text: 'This is a long text block.',
          },
        ],
      },
    ],
  },
};

export const Line = {
  render: () => {
    const [lines, setLines] = useState<string[]>([]);
    const [expanded, _] = useState(false);
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
