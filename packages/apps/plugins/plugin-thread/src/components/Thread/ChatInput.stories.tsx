//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ChatInput } from './ChatInput';

const Story = () => {
  return (
    <div className='flex w-[500px]'>
      <ChatInput
        className='p-2'
        placeholder='Enter message...'
        onMessage={(message) => {
          console.log(message);
        }}
      />
    </div>
  );
};

export default {
  component: ChatInput,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
