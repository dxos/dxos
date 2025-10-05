//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/react-ui-theme';

import { type MessageEntity, MessageStoryText } from '../testing';
import { Thread } from '../Thread';
import { translations } from '../translations';

import { MessageRoot } from './Message';

const DefaultStory = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState<MessageEntity>({
    id: 'm1',
    timestamp: new Date().toISOString(),
    authorId: identityKey.toHex(),
    text: 'hello',
  });

  return (
    <div className='mli-auto is-96 overflow-y-auto'>
      <Thread.Root id='t1'>
        <MessageRoot {...message} classNames={[hoverableControls, hoverableFocusedWithinControls]}>
          <MessageStoryText {...message} onDelete={() => console.log('delete')} />
        </MessageRoot>
      </Thread.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Message',
  component: MessageRoot as any,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
