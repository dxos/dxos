//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { create } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { PromptTemplate } from './PromptTemplate';
import { ChainPromptType, ChainType } from '../../types';

const template = [
  '# Comment',
  '',
  'You are a machine that is an expert chess player.',
  'The move history of the current game is: {history}',
  'If asked to suggest a move explain why it is a good move.',
  '',
  '---',
  '',
  '{input}',
].join('\n');

const Story = () => {
  const client = useClient();
  const [chain] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(
      create(ChainType, {
        prompts: [create(ChainPromptType, { command: 'test', template, inputs: [] })],
      }),
    );
  });

  return (
    <div className='flex justify-center'>
      <div className='flex w-full max-w-[800px] overflow-hidden overflow-y-scroll py-4'>
        <PromptTemplate prompt={chain.prompts![0]!} />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-chain/PromptTemplate',
  render: Story,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [ChainType, ChainPromptType] }),
    withTheme,
    withLayout(),
  ],
};

export const Default = {};
