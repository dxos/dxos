//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '../../translations';
import { Message } from './Message';

const DefaultStory = () => {
  const message = useMemo(
    () =>
      MessageType.make({
        sender: {
          name: random.person.fullName(),
          email: random.internet.email(),
        },
        blocks: [{ _tag: 'text', text: random.lorem.paragraph(2) }],
      }),
    [],
  );

  return (
    <Message.Root message={message} sender={undefined}>
      <Message.Toolbar />
      <Message.Viewport>
        <Message.Header />
        <Message.Body />
      </Message.Viewport>
    </Message.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Message',
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
