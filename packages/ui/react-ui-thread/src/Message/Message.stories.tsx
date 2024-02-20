//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { withTheme } from '@dxos/storybook-utils';

import { Message } from './Message';
import translations from '../translations';
import { type MessageEntity } from '../types';

const Story = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState<MessageEntity<{ id: string; text: string }>>({
    id: 'm1',
    authorId: identityKey.toHex(),
    blocks: [
      {
        id: 'b1',
        timestamp: new Date().toISOString(),
        text: 'hello',
      },
    ],
  });

  return (
    <div className='grid grid-cols-[var(--rail-size)_1fr]'>
      <Message {...message} />
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
