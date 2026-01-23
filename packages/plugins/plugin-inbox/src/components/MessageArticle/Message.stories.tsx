//
// Copyright 2023 DXOS.org
//

import { signal } from '@preact/signals-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '../../translations';

import { Message, type MessageRootProps } from './Message';

const DefaultStory = (props: MessageRootProps) => {
  return (
    <Message.Root {...props}>
      <Message.Toolbar />
      <Message.Viewport>
        <Message.Header />
        <Message.Content />
      </Message.Viewport>
    </Message.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/Message',
  component: Message.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: MessageType.make({
      sender: { name: 'John Doe', email: 'john@doe.com' },
      blocks: [{ _tag: 'text', text: 'Hello world!' }],
    }),
    sender: signal(undefined),
  },
};
