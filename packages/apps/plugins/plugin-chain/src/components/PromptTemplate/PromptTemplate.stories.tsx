//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { TextObject } from '@dxos/react-client/echo';

import { PromptTemplate } from './PromptTemplate';

const text = [
  'You are a machine that is an expert chess player.',
  'The move history of the current game: {history}',
  'If asked to suggest a move explain why it is a good move.',
  '---',
  '{question}',
].join('\n');

const Story = () => {
  const [prompt] = useState(new TextObject(text));

  return (
    <div className='m-4'>
      <PromptTemplate prompt={prompt} />
    </div>
  );
};

export default {
  component: PromptTemplate,
  render: Story,
};

export const Default = {};
