//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';

faker.seed(0);

const Render = ({ messages, ...props }: ThreadProps) => {
  return (
    <div className='flex grow justify-center overflow-center bg-base'>
      <div className='flex w-[500px] bg-white dark:bg-black'>
        <Thread {...props} messages={messages} onSubmit={() => {}} />
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
            pending: true,
            disposition: 'cot',
            text: [
              `1. ${faker.lorem.paragraph()}`,
              `2. ${faker.lorem.paragraph()}`,
              `3. ${faker.lorem.paragraph()}`,
              `4. ${faker.lorem.paragraph()}`,
            ].join('\n'),
          },
          {
            type: 'text',
            text: faker.lorem.paragraphs(3),
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
            text: faker.lorem.paragraphs(1),
          },
        ],
      },
    ],
  },
};

export const Input: Story = {
  args: {
    streaming: true,
  },
};
