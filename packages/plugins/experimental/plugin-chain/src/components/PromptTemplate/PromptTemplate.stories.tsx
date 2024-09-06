//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme } from '@dxos/storybook-utils';

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
  const [chain] = useState(
    create(ChainType, {
      prompts: [create(ChainPromptType, { command: 'test', template, inputs: [] })],
    }),
  );

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
  decorators: [withTheme],
};

export const Default = {};
