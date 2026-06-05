//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Message } from './Message';
import { createMessages, getStoryMetadata } from '../testing';
import { Thread } from '../Thread';

const DefaultStory = () => {
  const messages = useMemo(() => createMessages(3), []);
  return (
    <div className='mx-auto w-96 overflow-y-auto'>
      <Thread.Root getMetadata={getStoryMetadata} identityDid='did:key:alice' editable onMessageDelete={() => {}}>
        {messages.map((message) => (
          <Message.Tile key={Obj.getURI(message)} message={message} />
        ))}
      </Thread.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Message',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
