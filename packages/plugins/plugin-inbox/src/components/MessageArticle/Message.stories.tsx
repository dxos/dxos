//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Message, type MessageRootProps } from './Message ';

const DefaultStory = (props: MessageRootProps) => {
  return <Message.Root {...props} />;
};

const meta = {
  title: 'ui/plugin-inbox/Message',
  component: Message.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
