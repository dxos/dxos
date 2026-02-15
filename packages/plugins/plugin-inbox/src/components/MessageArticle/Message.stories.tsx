//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme() } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '../../translations';

import { Message } from './Message';

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const DefaultStory = () => {
  const message = useMemo(
    () =>
      MessageType.make({
        sender: { name: 'John Doe', email: 'john@doe.com' },
        blocks: [{ _tag: 'text', text: 'Hello world!' }],
      }),
    [],
  );
  return (
    <Message.Root message={message} sender={undefined}>
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
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
