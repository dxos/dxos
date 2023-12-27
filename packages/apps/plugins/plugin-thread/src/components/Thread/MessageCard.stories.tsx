//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/keys';
import { withTheme } from '@dxos/storybook-utils';

import { type BlockProperties, MessageCard } from './MessageCard';

const getBlockProperties = (identityKey: PublicKey | undefined): BlockProperties => ({
  displayName: identityKey?.toHex() ?? 'anonymous',
});

const Story = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState(
    new MessageType({
      from: {
        identityKey: identityKey.toHex(),
      },
      blocks: [
        {
          text: 'hello',
        },
      ],
    }),
  );

  return (
    <div className='flex w-[400px]'>
      <MessageCard message={message} propertiesProvider={getBlockProperties} />
    </div>
  );
};

export default {
  component: MessageCard,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
