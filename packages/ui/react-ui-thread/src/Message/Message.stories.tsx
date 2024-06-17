//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { withTheme } from '@dxos/storybook-utils';

import { Message } from './Message';
import { DefaultMessageText, type MessageEntity } from '../testing';
import translations from '../translations';

const Story = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState<MessageEntity>({
    id: 'm1',
    timestamp: new Date().toISOString(),
    authorId: identityKey.toHex(),
    text: 'hello',
  });

  return (
    <div className='grid grid-cols-[var(--rail-size)_1fr]'>
      <Message {...message}>
        <DefaultMessageText text={message.text} onDelete={() => console.log('delete')} />
      </Message>
    </div>
  );
};

export default {
  title: 'react-ui-thread/Message',
  component: Message,
  render: Story,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {};
