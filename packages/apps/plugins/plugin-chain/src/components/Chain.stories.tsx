//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ChainInput, ChainPromptType, ChainType, TextV0Type } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Chain } from './Chain';

const useChain = () => {
  const client = useClient();
  const [chain, setChain] = useState<ChainType>();

  useEffect(() => {
    const space = client.spaces.default;

    client.addSchema(ChainType, ChainPromptType, TextV0Type, ChainInput);

    const chain = space.db.add(create(ChainType, { prompts: [] }));
    space.db.add(chain);
    setChain(chain);
  }, [client, setChain]);

  return chain;
};

const ChainStory = () => {
  const chain = useChain();

  if (!chain) {
    return null;
  }

  return (
    <div role='none' className='is-full pli-8'>
      <Chain chain={chain} />
    </div>
  );
};

export default {
  title: 'plugin-chain/Chain',
  component: Chain,
  render: () => <ClientRepeater component={ChainStory} createIdentity createSpace />,
  decorators: [withTheme],
};

export const Default = {};
