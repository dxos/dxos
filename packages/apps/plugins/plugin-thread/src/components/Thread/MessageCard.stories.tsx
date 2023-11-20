//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/keys';

import { type BlockProperties, MessageCard } from './MessageCard';

// TODO(burdon): Translation provider (decorator?)

const getBlockProperties = (identityKey: PublicKey): BlockProperties => ({
  displayName: 'Tester',
});

const Story = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState(
    new ThreadType.Message({
      identityKey: identityKey.toHex(),
      blocks: [
        {
          text: 'hello',
        },
      ],
    }),
  );

  return <MessageCard message={message} identityKey={identityKey} propertiesProvider={getBlockProperties} />;
};

export default {
  component: MessageCard,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
