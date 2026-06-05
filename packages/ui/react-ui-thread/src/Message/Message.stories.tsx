//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { createMessages, getStoryMetadata } from '../testing';
import { Thread } from '../Thread';
import { Message } from './Message';

const DefaultStory = () => {
  const [message] = useMemo(() => createMessages(1), []);
  return (
    <Thread.Root getMetadata={getStoryMetadata} identityDid='did:key:alice' editable onMessageDelete={() => {}}>
      <Message.Tile message={message} />
    </Thread.Root>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Message',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'border w-(min-card-width)' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
