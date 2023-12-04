//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { TextObject } from '@dxos/react-client/echo';

import { PromptTemplate } from './PromptTemplate';

const text = [
  '# Comment',
  '',
  'You are a machine that is an expert chess player.',
  'The move history of the current game is: {history}',
  'If asked to suggest a move explain why it is a good move.',
  '',
  '---',
  '{question}',
].join('\n');

const Story = () => {
  // TODO(burdon): How to test reactivity?
  const [prompt] = useState({ source: new TextObject(text) });

  return (
    <div className='flex justify-center'>
      <div className='flex w-full max-w-[800px] overflow-hidden overflow-y-scroll'>
        <PromptTemplate prompt={prompt} />
      </div>
    </div>
  );
};

export default {
  component: PromptTemplate,
  render: Story,
};

export const Default = {};
